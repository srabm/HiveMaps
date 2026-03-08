import type * as GeoJSON from 'geojson'
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapboxGL } from '@/services/mapbox';
import { RoomLabelLayer } from '@/components/indoor/room-label-layer';
import { POIMarker } from '@/components/indoor/POIMarker';
import { MaterialIcons } from '@expo/vector-icons';
import DirectionBar from '@/components/directions-bars';
import { createIndoorNodeSearchAdapter } from '@/services/maps/indoor-node-search-adapter';
import { fetchNearestNode } from '@/services/http/indoor-api';

export type FloorPlanViewerProps = {
    planGeometry?: GeoJSON.Geometry | null
    rooms?: GeoJSON.FeatureCollection | null
    selectedRoomId?: string | null
    onPressRoom?: (roomId: string) => void
    buildingCode: string
    floorId: string
}

type RoomFeatureProperties = {
  id?: string
  roomId?: string
  room_id?: string
  code?: string
  name?: string
  label?: string
  type?: string
  [key: string]: unknown
}

type MapPressFeature = {
    id?: string | number
    properties?: RoomFeatureProperties
}

const POI_TYPES = [
  'bathroom', 'bathroom_men', 'bathroom_women', 'bathroom_unisex',
  'bathroom_unisex_acc', 'bathroom_men_acc', 'bathroom_women_acc',
  'bathroom_private_acc', 'water_fountain', 'stairs', 'elevator', 
  'escalator', 'printer', 'ramp'
]

const getRoomId = (feature: MapPressFeature): string | null => {
    const propertyId =
        feature.properties?.roomId ??
        feature.properties?.room_id ??
        feature.properties?.id ??
        feature.properties?.code
    const rawId = feature.id ?? propertyId

    if (typeof rawId === 'string' && rawId.trim().length > 0) return rawId
    if (typeof rawId === 'number') return String(rawId)
    return null
}

const getRoomLabel = (feature: MapPressFeature): string | null => {
    const properties = feature.properties
    if (!properties) return null

    const label = properties.label ?? properties.name ?? properties.code ?? properties.id ?? properties.roomId
    if (typeof label === 'string' && label.trim().length > 0) return label
    return null
}

const collectCoordinates = (geometry: GeoJSON.Geometry | null | undefined): [number, number][] => {
    if (!geometry) return []

    const accumulator: [number, number][] = []

    const addCoordinateList = (coords: unknown): void => {
        if (!Array.isArray(coords)) return
        if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            accumulator.push([coords[0], coords[1]])
            return
        }
        coords.forEach(addCoordinateList)
    }

    const addGeometry = (item: GeoJSON.Geometry) => {
        if (item.type === 'GeometryCollection') {
            item.geometries.forEach(addGeometry)
            return
        }
        addCoordinateList(item.coordinates)
    }
    addCoordinateList((item as any).coordinates)
  }

  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach(addGeometry)
  } else {
    addCoordinateList((geometry as any).coordinates)
  }

    return accumulator
}

const getGeometryCenter = (geometry: GeoJSON.Geometry | null | undefined): [number, number] => {
  const coords = collectCoordinates(geometry)
  if (coords.length === 0) return [-73.578, 45.496]

  const bounds = coords.reduce(
    (memo, [lng, lat]) => ({
      minLng: Math.min(memo.minLng, lng),
      maxLng: Math.max(memo.maxLng, lng),
      minLat: Math.min(memo.minLat, lat),
      maxLat: Math.max(memo.maxLat, lat),
    }),
    {
      minLng: coords[0][0],
      maxLng: coords[0][0],
      minLat: coords[0][1],
      maxLat: coords[0][1],
    },
  )

  return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2]
}

const getCenterCoordinate = (
  planGeometry?: GeoJSON.Geometry | null,
  rooms?: GeoJSON.FeatureCollection | null,
): [number, number] => {
  const planCoordinates = collectCoordinates(planGeometry)
  const roomCoordinates = rooms?.features?.flatMap((feature) => collectCoordinates(feature.geometry)) ?? []
  const coordinates = [...planCoordinates, ...roomCoordinates]
  
  if (coordinates.length === 0) return [-73.578, 45.496]

  const bounds = coordinates.reduce(
    (memo, [lng, lat]) => ({
      minLng: Math.min(memo.minLng, lng),
      maxLng: Math.max(memo.maxLng, lng),
      minLat: Math.min(memo.minLat, lat),
      maxLat: Math.max(memo.maxLat, lat),
    }),
    {
      minLng: coordinates[0][0],
      maxLng: coordinates[0][0],
      minLat: coordinates[0][1],
      maxLat: coordinates[0][1],
    },
  )

    const bounds = coordinates.reduce(
        (memo, [lng, lat]) => ({
            minLng: Math.min(memo.minLng, lng),
            maxLng: Math.max(memo.maxLng, lng),
            minLat: Math.min(memo.minLat, lat),
            maxLat: Math.max(memo.maxLat, lat),
        }),
        {
            minLng: coordinates[0][0],
            maxLng: coordinates[0][0],
            minLat: coordinates[0][1],
            maxLat: coordinates[0][1],
        },
    )

    return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2]
}

export function FloorPlanViewer({
                                    planGeometry,
                                    rooms,
                                    selectedRoomId,
                                    onPressRoom,
                                    buildingCode,
                                    floorId
                                }: FloorPlanViewerProps) {
      
  const { roomCollectionForLabels, poiFeatures } = useMemo(() => {
    if (!rooms?.features) return { roomCollectionForLabels: null, poiFeatures: [] }

    const labelRooms: GeoJSON.Feature[] = []
    const pois: GeoJSON.Feature[] = []

    rooms.features.forEach((feature) => {
      const type = (feature.properties?.type as string | undefined)?.toLowerCase().trim()
      if (type && POI_TYPES.includes(type)) {
        pois.push(feature)
      } else {
        labelRooms.push(feature)
      }
    })

    return {
      roomCollectionForLabels: { type: 'FeatureCollection' as const, features: labelRooms },
      poiFeatures: pois,
    }
  }, [rooms])
  
    const centerCoordinate = useMemo(() => getCenterCoordinate(planGeometry, rooms), [planGeometry, rooms])
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [fromNodeId, setFromNodeId] = useState<string | null>(null);
    const [toNodeId, setToNodeId] = useState<string | null>(null);
    const nodeAdapter = useMemo(() => createIndoorNodeSearchAdapter(buildingCode, floorId), [buildingCode, floorId]);

    // Track last known user coordinates from the in-map UserLocation
    const userCoordsRef = useRef<[number, number] | null>(null);
    // Track whether nearest-node has already been resolved for the current floor
    const nearestNodeResolvedRef = useRef(false);

    const resolveNearestNode = useCallback(async (longitude: number, latitude: number) => {
        console.log('[NearestNode] Request →', {buildingCode, floorId, longitude, latitude});
        try {
            const node = await fetchNearestNode(buildingCode, floorId, longitude, latitude);
            console.log('[NearestNode] Response ←', node);
            setFromNodeId(node.id);
            setFromQuery('Current Location');
        } catch (err) {
            console.log('[NearestNode] No matching node found:', err instanceof Error ? err.message : err);
            setFromNodeId(null);
            setFromQuery('');
        }
    }, [buildingCode, floorId]);

    // When buildingCode or floorId changes, reset the resolved flag and re-attempt if we have coordinates
    useEffect(() => {
        nearestNodeResolvedRef.current = false;
        const coords = userCoordsRef.current;
        if (coords) {
            nearestNodeResolvedRef.current = true;
            resolveNearestNode(coords[0], coords[1]);
        }
    }, [buildingCode, floorId, resolveNearestNode]);

    const handleUserLocationUpdate = useCallback((loc: any) => {
        const coords = loc?.coords;
        if (!coords) return;
        const longitude: number = coords.longitude;
        const latitude: number = coords.latitude;
        userCoordsRef.current = [longitude, latitude];
        // Only trigger nearest-node once per floor load
        if (!nearestNodeResolvedRef.current) {
            nearestNodeResolvedRef.current = true;
            resolveNearestNode(longitude, latitude);
        }
    }, [resolveNearestNode]);

    const planShape = useMemo(() => {
        if (!planGeometry) return null
        return {
            type: 'FeatureCollection' as const,
            features: [{type: 'Feature' as const, id: 'plan-geometry', geometry: planGeometry, properties: {}}],
        }
    }, [planGeometry])

    const selectedRoomFeature = useMemo(() => {
        if (!rooms || !selectedRoomId) return null

        const match = rooms.features.find((feature) => {
            const roomId = getRoomId({
                id: feature.id as string | number,
                properties: feature.properties as RoomFeatureProperties
            })
            return roomId === selectedRoomId
        })

        if (!match) return null
        return {
            type: 'FeatureCollection' as const,
            features: [match],
        }
    }, [rooms, selectedRoomId])

    const selectedRoomLabel = useMemo(() => {
        if (!selectedRoomFeature?.features[0]) return null
        return getRoomLabel({
            id: selectedRoomFeature.features[0].id as string | number,
            properties: selectedRoomFeature.features[0].properties as RoomFeatureProperties,
        })
    }, [selectedRoomFeature])

    const handleRoomPress = (event: any) => {
        const feature = event?.features?.[0] as MapPressFeature | undefined
        if (!feature) return
        const roomId = getRoomId(feature)
        if (!roomId || !onPressRoom) return
        onPressRoom(roomId)
    }
  }, [rooms, selectedRoomId])

  const selectedRoomLabel = useMemo(() => {
    if (!selectedRoomFeature?.features[0]) return null
    return getRoomLabel({
      id: selectedRoomFeature.features[0].id as string | number,
      properties: selectedRoomFeature.features[0].properties as RoomFeatureProperties,
    })
  }, [selectedRoomFeature])

  const handleRoomPress = (event: any) => {
    const feature = event?.features?.[0] as MapPressFeature | undefined
    if (!feature) return
    const roomId = getRoomId(feature)
    if (!roomId || !onPressRoom) return
    onPressRoom(roomId)
  }

  return (
    <View testID="indoor-floor-plan" style={styles.container}>
      {planShape && rooms ? (
        <MapboxGL.MapView 
          style={StyleSheet.absoluteFill} 
          logoEnabled={false} 
          scaleBarEnabled={false}
          styleURL={MapboxGL.StyleURL.Light} 
        >
          <MapboxGL.Camera 
            ref={cameraRef}
            centerCoordinate={centerCoordinate} 
            zoomLevel={18.5} 
            animationDuration={600} 
          />

          <MapboxGL.UserLocation
            visible={false}
            onUpdate={handleUserLocationUpdate}
          />

          <MapboxGL.ShapeSource id="indoor-plan-source" shape={planShape}>
            <MapboxGL.FillLayer
              id="indoor-plan-fill"
              style={{
                fillColor: '#e5e7eb',
                fillOpacity: 0.8,
              }}
            />
            <MapboxGL.LineLayer
              id="indoor-plan-outline"
              style={{
                lineColor: '#374151',
                lineWidth: 1.5,
              }}
            />
          </MapboxGL.ShapeSource>

          <MapboxGL.ShapeSource
            id="indoor-rooms-source"
            shape={rooms}
            onPress={handleRoomPress}
            testID="indoor-rooms-source"
          >
            <MapboxGL.FillLayer
              id="indoor-rooms-fill"
              style={{
                fillColor: '#f59e0b',
                fillOpacity: 0.25,
              }}
            />
            <MapboxGL.LineLayer
              id="indoor-rooms-outline"
              style={{
                lineColor: '#92400e',
                lineWidth: 1,
              }}
            />
          </MapboxGL.ShapeSource>

          {selectedRoomFeature && (
            <MapboxGL.ShapeSource id="indoor-room-selected-source" shape={selectedRoomFeature}>
              <MapboxGL.FillLayer
                id="indoor-room-selected-fill"
                style={{
                  fillColor: '#f97316',
                  fillOpacity: 0.55,
                }}
              />
              <MapboxGL.LineLayer
                id="indoor-room-selected-outline"
                style={{
                  lineColor: '#9a3412',
                  lineWidth: 2,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
          
          {poiFeatures.map((poi, index) => {
            const coords = poi.geometry.type === 'Point' 
              ? (poi.geometry as GeoJSON.Point).coordinates 
              : getGeometryCenter(poi.geometry);

            const poiId = poi.properties?.id || `poi-fallback-${index}`;
            const poiType = poi.properties?.type as string;
            const poiLabel = poi.properties?.label as string | undefined;

            return (
              <MapboxGL.MarkerView
                key={`poi-${poiId}`}
                id={`poi-${poiId}`}
                coordinate={coords}
              >
                <POIMarker type={poiType} label={poiLabel} size={22} />
              </MapboxGL.MarkerView>
            );
          })}

          <RoomLabelLayer rooms={roomCollectionForLabels} selectedRoomId={selectedRoomId} />
        </MapboxGL.MapView>
      ) : (
        <Text style={styles.placeholderText}>Floor plan viewer loading...</Text>
      )}

      <View style={styles.directionBarContainer} pointerEvents="box-none">
          <DirectionBar
              mapsAdapter={nodeAdapter}
              fromValue={fromQuery}
              toValue={toQuery}
              onChangeFrom={setFromQuery}
              onChangeTo={setToQuery}
              onSelectFrom={(mapLocation, coordinates) => {
                  setFromQuery(mapLocation.name);
                  setFromNodeId(mapLocation.id);
                  if (coordinates) cameraRef.current?.setCamera({
                      centerCoordinate: coordinates,
                      zoomLevel: 21,
                      animationDuration: 500
                  });
              }}
              onSelectTo={(mapLocation, coordinates) => {
                  setToQuery(mapLocation.name);
                  setToNodeId(mapLocation.id);
                  if (coordinates) cameraRef.current?.setCamera({
                      centerCoordinate: coordinates,
                      zoomLevel: 21,
                      animationDuration: 500
                  });
              }}
              onClearFrom={() => {
                  setFromQuery('');
                  setFromNodeId(null);
              }}
              onClearTo={() => {
                  setToQuery('');
                  setToNodeId(null);
              }}
              onResetFrom={() => {
                  setFromQuery('');
                  setFromNodeId(null);
              }}
              onSwap={() => {
                  const tempQuery = fromQuery;
                  const tempNodeId = fromNodeId;
                  setFromQuery(toQuery);
                  setFromNodeId(toNodeId);
                  setToQuery(tempQuery);
                  setToNodeId(tempNodeId);
              }}
              onClose={() => {
                  setFromQuery('');
                  setFromNodeId(null);
                  setToQuery('');
                  setToNodeId(null);
              }}
              fromPlaceholder="From room (e.g. H8.835)"
              toPlaceholder="To room (e.g. H8.841)"
          />
      </View>

      {selectedRoomId && (
        <View testID="indoor-room-info-card" style={styles.infoCard}>
          <Text testID="indoor-selected-room-label" style={styles.infoCardText}>
            {selectedRoomLabel ? `Selected room: ${selectedRoomLabel}` : `Selected room: ${selectedRoomId}`}
          </Text>
        </View>
      )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    placeholderText: {
        color: '#6b7280',
        fontStyle: 'italic',
        alignSelf: 'center',
        marginTop: 20,
    },
    infoCard: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    infoCardText: {
        color: '#111827',
        fontWeight: '600',
    },
    directionBarContainer: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        zIndex: 1000,
    }
})
