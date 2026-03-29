import type * as GeoJSON from 'geojson'
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapboxGL } from '@/services/mapbox';
import { RoomLabelLayer } from '@/components/indoor/room-label-layer';
import { POIMarker } from '@/components/indoor/POIMarker';
import DirectionBar from '@/components/directions-bars';
import { createIndoorNodeSearchAdapter } from '@/services/maps/indoor-node-search-adapter';
import {IndoorDirectionsResponse, fetchNearestNode, fetchIndoorDirections, IndoorNodeResponse, POI_TYPES} from '@/services/http/indoor-api'
import {DirectionsLine} from "@/components/ui/directions-line";
import DirectionsModal from "@/components/indoor/indoor-directions-modal";
import AccessibilityToggle from '@/components/indoor/accessibility-toggle';
import { useIndoorNavigationState } from '@/state/indoor-navigation-state';

export type FloorPlanViewerProps = Readonly<{
    planGeometry?: GeoJSON.Geometry | null
    rooms?: GeoJSON.FeatureCollection | null
    selectedRoomId?: string | null
    onPressRoom?: (roomId: string) => void
    onDirectionsActiveChange?: (active: boolean) => void
    onStepFloorChange?: (floor: string) => void
    buildingCode: string
    floorId: string
    initialFromQuery?: string
    initialToQuery?: string
    initialFromNodeId?: string | null
    initialToNodeId?: string | null
}>

type RoomFeatureProperties = {
  id?: string
  roomId?: string
  room_id?: string
  nodeID?: string
  nodeId?: string
  node_id?: string
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

type PoiDestinationCandidate = {
  label: string
  coordinates: [number, number]
  mapContextKey: string
}

const DEFAULT_MAP_CENTER: [number, number] = [-73.578, 45.496];

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

const formatPoiTypeLabel = (value?: string | null): string | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return normalized
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getPoiLabel = (feature: MapPressFeature): string => {
  const explicitLabel = getRoomLabel(feature)
  if (explicitLabel) return explicitLabel

  const typedLabel = formatPoiTypeLabel(feature.properties?.type)
  return typedLabel ? `POI: ${typedLabel}` : 'Point of interest'
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
        addCoordinateList((item as any).coordinates)
    }

    addGeometry(geometry)

    return accumulator
}

const calculateBoundingBoxCenter = (coords: [number, number][]): [number, number] => {
  if (coords.length === 0) return DEFAULT_MAP_CENTER;

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
  );

  return [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2];
};

const getGeometryCenter = (geometry: GeoJSON.Geometry | null | undefined): [number, number] => {
  const coords = collectCoordinates(geometry)
  return calculateBoundingBoxCenter(coords);
}

const getCenterCoordinate = (
  planGeometry?: GeoJSON.Geometry | null,
  rooms?: GeoJSON.FeatureCollection | null,
): [number, number] => {
  const planCoordinates = collectCoordinates(planGeometry)
  const roomCoordinates = rooms?.features?.flatMap((feature) => collectCoordinates(feature.geometry)) ?? []
  const coordinates = [...planCoordinates, ...roomCoordinates]
  
  return calculateBoundingBoxCenter(coordinates);
}

const convertCoordinatesToFeature = (coordinates: [number, number]) => {
    return {
        type: 'FeatureCollection' as const,
        features: [
            {
                type: 'Feature' as const,
                id: 'user-location',
                geometry: {type: 'Point' as const, coordinates: coordinates},
                properties: {},
            },
        ],
    };
}

export const buildFloorTraversalList = (startFloor: number, endFloor: number): number[] => {
    const step = startFloor <= endFloor ? 1 : -1
    const floors: number[] = []

    for (let floor = startFloor; step > 0 ? floor <= endFloor : floor >= endFloor; floor += step) {
        floors.push(floor)
    }

    return floors
}

const extractFloorFromNodeId = (nodeId: string | null, buildingCode: string): number | null => {
    if (!nodeId) return null

    const normalizedBuildingCode = buildingCode.trim().toUpperCase()
    const normalizedNodeId = nodeId.trim().toUpperCase()
    if (!normalizedNodeId.startsWith(normalizedBuildingCode)) return null

    const remainder = normalizedNodeId.slice(normalizedBuildingCode.length)
    const floorToken = remainder.split('.')[0]
    if (!/^-?\d+$/.test(floorToken)) return null

    return Number(floorToken)
}
const POI_TYPES_SET = new Set(POI_TYPES);

type TransitionIconName = 'uparrow' | 'downarrow'
type TransitionMarker = {
  coordinate: [number, number]
  icon: TransitionIconName
}

const getNumericFloor = (value: string | null | undefined): number | null => {
  if (!value) return null
  const match = value.trim().match(/-?\d+/)
  if (!match) return null
  return Number(match[0])
}

const floorsMatch = (nodeFloor: string | null | undefined, activeFloor: string | null | undefined): boolean => {
  if (!nodeFloor || !activeFloor) return false
  const normalizedNodeFloor = nodeFloor.trim().toUpperCase()
  const normalizedActiveFloor = activeFloor.trim().toUpperCase()
  if (normalizedNodeFloor === normalizedActiveFloor) return true

  const nodeNumeric = getNumericFloor(normalizedNodeFloor)
  const activeNumeric = getNumericFloor(normalizedActiveFloor)
  return nodeNumeric !== null && activeNumeric !== null && nodeNumeric === activeNumeric
}

const resolveTransitionIcon = (
  fromFloor: string | null | undefined,
  toFloor: string | null | undefined,
  fallbackText: string,
): TransitionIconName => {
  const fromNumeric = getNumericFloor(fromFloor)
  const toNumeric = getNumericFloor(toFloor)
  if (fromNumeric !== null && toNumeric !== null) {
    return toNumeric < fromNumeric ? 'downarrow' : 'uparrow'
  }

  const normalizedText = fallbackText.toLowerCase()
  if (normalizedText.includes('down')) return 'downarrow'
  if (normalizedText.includes('up')) return 'uparrow'
  return 'uparrow'
}

type RouteNodeReference = {
  node: IndoorNodeResponse
  description: string
}

const dedupeConsecutiveRouteNodes = (routeNodes: RouteNodeReference[]): RouteNodeReference[] => {
  if (routeNodes.length === 0) return []

  const deduped: RouteNodeReference[] = [routeNodes[0]]
  for (let index = 1; index < routeNodes.length; index += 1) {
    const current = routeNodes[index]
    const previous = deduped[deduped.length - 1]
    const sameNode = current.node.id === previous.node.id
    const sameCoordinate =
      current.node.longitude === previous.node.longitude && current.node.latitude === previous.node.latitude
    const sameFloor = floorsMatch(current.node.floor, previous.node.floor)

    if (sameNode || (sameCoordinate && sameFloor)) continue
    deduped.push(current)
  }

  return deduped
}

export const buildActiveFloorRouteView = (
  indoorSteps: IndoorDirectionsResponse[] | null | undefined,
  activeFloorId: string,
  currentNodeId?: string | null,
): {
  steps: IndoorDirectionsResponse[]
  startTransitionMarker: TransitionMarker | null
  endTransitionMarker: TransitionMarker | null
} => {
  if (!indoorSteps || indoorSteps.length === 0 || !activeFloorId) {
    return { steps: [], startTransitionMarker: null, endTransitionMarker: null }
  }

  const routeNodes = dedupeConsecutiveRouteNodes(
    indoorSteps.flatMap((step) => step.nodes.map((node) => ({ node, description: step.description }))),
  )
  if (routeNodes.length === 0) return { steps: [], startTransitionMarker: null, endTransitionMarker: null }

  const segments: Array<{ start: number; end: number }> = []
  let segmentStart: number | null = null

  for (let index = 0; index < routeNodes.length; index += 1) {
    const matchesActiveFloor = floorsMatch(routeNodes[index].node.floor, activeFloorId)
    if (matchesActiveFloor) {
      if (segmentStart === null) segmentStart = index
      continue
    }

    if (segmentStart !== null) {
      segments.push({ start: segmentStart, end: index - 1 })
      segmentStart = null
    }
  }

  if (segmentStart !== null) {
    segments.push({ start: segmentStart, end: routeNodes.length - 1 })
  }

  if (segments.length === 0) return { steps: [], startTransitionMarker: null, endTransitionMarker: null }

  const selectedSegment =
    (currentNodeId
      ? segments.find(({ start, end }) =>
          routeNodes.slice(start, end + 1).some(({ node }) => node.id === currentNodeId),
        )
      : null) || segments[0]

  const segmentNodes = routeNodes.slice(selectedSegment.start, selectedSegment.end + 1).map(({ node }) => node)
  const steps: IndoorDirectionsResponse[] =
    segmentNodes.length > 0
      ? [{ direction: 'STRAIGHT', distance: 0, description: '', nodes: segmentNodes }]
      : []

  const segmentStartNode = segmentNodes[0]
  const segmentEndNode = segmentNodes[segmentNodes.length - 1]
  const previousNodeRef = routeNodes[selectedSegment.start - 1]
  const nextNodeRef = routeNodes[selectedSegment.end + 1]

  const startTransitionMarker: TransitionMarker | null = previousNodeRef
    ? {
        coordinate: [segmentStartNode.longitude, segmentStartNode.latitude],
        icon: resolveTransitionIcon(
          previousNodeRef.node.floor,
          segmentStartNode.floor,
          `${previousNodeRef.description} ${routeNodes[selectedSegment.start].description}`,
        ),
      }
    : null

  const endTransitionMarker: TransitionMarker | null = nextNodeRef
    ? {
        coordinate: [segmentEndNode.longitude, segmentEndNode.latitude],
        icon: resolveTransitionIcon(
          segmentEndNode.floor,
          nextNodeRef.node.floor,
          `${routeNodes[selectedSegment.end].description} ${nextNodeRef.description}`,
        ),
      }
    : null

  return { steps, startTransitionMarker, endTransitionMarker }
}

function separateRoomFeatures(rooms?: GeoJSON.FeatureCollection | null) {
  if (!rooms?.features) return { roomCollectionForLabels: null, poiFeatures: [] }

  const labelRooms: GeoJSON.Feature[] = []
  const pois: GeoJSON.Feature[] = []

  rooms.features.forEach((feature) => {
    const type = (feature.properties?.type as string | undefined)?.toLowerCase().trim()
    if (type && POI_TYPES_SET.has(type)) {
      pois.push(feature)
    } else {
      labelRooms.push(feature)
    }
  })

  return {
    roomCollectionForLabels: { type: 'FeatureCollection' as const, features: labelRooms },
    poiFeatures: pois,
  }
}

export function FloorPlanViewer({
                                    planGeometry,
                                    rooms,
                                    selectedRoomId,
                                    onPressRoom,
                                    onDirectionsActiveChange,
                                    onStepFloorChange,
                                    buildingCode,
                                    floorId,
                                    initialFromQuery = '',
                                    initialToQuery = '',
                                    initialFromNodeId = null,
                                    initialToNodeId = null,
                                }: FloorPlanViewerProps) {
      
  const { roomCollectionForLabels, poiFeatures } = useMemo(() => separateRoomFeatures(rooms), [rooms]);
  
    const { accessible, setAccessible } = useIndoorNavigationState();
    const centerCoordinate = useMemo(() => getCenterCoordinate(planGeometry, rooms), [planGeometry, rooms])
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const [fromQuery, setFromQuery] = useState(initialFromQuery);
    const [toQuery, setToQuery] = useState(initialToQuery);
    const [fromNodeId, setFromNodeId] = useState<string | null>(initialFromNodeId);
    const [toNodeId, setToNodeId] = useState<string | null>(initialToNodeId);
    const [indoorSteps, setIndoorSteps] = useState<IndoorDirectionsResponse[] | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [currentNode, setCurrentNode] = useState<IndoorNodeResponse | null>(null);
    const mapContextKey = `${buildingCode}::${floorId}`;
    const mapContextKeyRef = useRef(mapContextKey);
    const poiSelectionTokenRef = useRef(0);
    mapContextKeyRef.current = mapContextKey;
    const invalidatePendingPoiSelection = useCallback(() => {
      poiSelectionTokenRef.current += 1;
    }, []);
    const nodeAdapter = useMemo(() => createIndoorNodeSearchAdapter(buildingCode), [buildingCode]);
    const floorsToTraverse = useMemo(() => {
        const startFloor = extractFloorFromNodeId(fromNodeId, buildingCode)
        const endFloor = extractFloorFromNodeId(toNodeId, buildingCode)
        if (startFloor === null || endFloor === null) return []
        return buildFloorTraversalList(startFloor, endFloor)
    }, [fromNodeId, toNodeId, buildingCode])
    const activeFloorRouteView = useMemo(
      () => buildActiveFloorRouteView(indoorSteps, floorId, currentNode?.id),
      [indoorSteps, floorId, currentNode?.id],
    )
    // Track last known user coordinates from the in-map UserLocation
    const userCoordsRef = useRef<[number, number] | null>(null);
    // Track whether nearest-node has already been resolved for the current floor
    const nearestNodeResolvedRef = useRef(Boolean(initialFromNodeId));
    const resolveNearestNode = useCallback(async (longitude: number, latitude: number) => {
        try {
            const node = await fetchNearestNode(buildingCode, floorId, longitude, latitude);
            setFromNodeId(node.id);
            setFromQuery('Current Location');
        } catch (err) {
            console.warn('[NearestNode] No matching node found:', err);
            setFromNodeId(null);
            setFromQuery('');
        }
    }, [buildingCode, floorId]);

    const resolveDirections = useCallback(async (fromNodeId: string, toNodeId: string, accessible: boolean, fromText: string, toText: string) => {
        try {
            const steps = await fetchIndoorDirections(buildingCode, fromNodeId, toNodeId, accessible);
            setIndoorSteps(steps);
        } catch (err) {
            console.warn('[IndoorDirections] No directions found:', err);
            setIndoorSteps(null);
            setCurrentNode(null);
        }
    }, [buildingCode]);

    // When buildingCode or floorId changes, reset the resolved flag and re-attempt if we have coordinates
    useEffect(() => {
        if (fromNodeId) {
            nearestNodeResolvedRef.current = true;
            return;
        }
        if (indoorSteps) return;
        nearestNodeResolvedRef.current = false;
        const coords = userCoordsRef.current;
        if (coords) {
            nearestNodeResolvedRef.current = true;
            resolveNearestNode(coords[0], coords[1]);
        }
    }, [buildingCode, floorId, fromNodeId, indoorSteps, resolveNearestNode]);

    useEffect(() => {
        if (!fromNodeId || !toNodeId) {
            setIndoorSteps(null);
            setCurrentNode(null);
            return;
        }
        resolveDirections(fromNodeId, toNodeId, accessible, fromQuery, toQuery);
    }, [fromNodeId, toNodeId, accessible, resolveDirections]);

    useEffect(() => {
        if (onDirectionsActiveChange) {
            onDirectionsActiveChange(!!indoorSteps);
        }
    }, [indoorSteps, onDirectionsActiveChange]);

    useEffect(() => {
      invalidatePendingPoiSelection();
    }, [buildingCode, floorId, invalidatePendingPoiSelection]);

    useEffect(() => {
        if (floorsToTraverse.length > 0) {
            console.log('[IndoorDirections] Floors to traverse \u2192', floorsToTraverse)
        }
    }, [floorsToTraverse])

    const handleUserLocationUpdate = useCallback((loc: any) => {
        const coords = loc?.coords;
        if (!coords) return;
        const longitude: number = coords.longitude;
        const latitude: number = coords.latitude;
        userCoordsRef.current = [longitude, latitude];
        // Only trigger nearest-node once per floor load
        if (!nearestNodeResolvedRef.current && !indoorSteps && !fromNodeId) {
            nearestNodeResolvedRef.current = true;
            resolveNearestNode(longitude, latitude);
        }
        setUserLocation([longitude, latitude]);
    }, [fromNodeId, indoorSteps, resolveNearestNode]);



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

    const findNearestIndoorNode = async(longitude: number, latitude: number) :Promise<string | null> => {

        try {
            const node = await fetchNearestNode(buildingCode, floorId, longitude, latitude);
            return node.id;
        } catch {
            return null;
        }


    }

    const applyPoiAsDestination = async (poi: PoiDestinationCandidate) => {
      if (indoorSteps) return;

      const selectionToken = ++poiSelectionTokenRef.current;
      const selectionContext = poi.mapContextKey;

      const resolvedNodeId = await findNearestIndoorNode(poi.coordinates[0], poi.coordinates[1]);

      const isLatestSelection = selectionToken === poiSelectionTokenRef.current;
      const sameMapContext = selectionContext === mapContextKeyRef.current;
      if (!isLatestSelection || !sameMapContext) return;

      setToQuery(poi.label);
      setToNodeId(null);
      if (resolvedNodeId) {
        setToNodeId(resolvedNodeId);
      }
      cameraRef.current?.setCamera({
        centerCoordinate: poi.coordinates,
        zoomLevel: 21,
        animationDuration: 500,
      });
    }

    const handleRoomPress = async (event: any) => {
        const feature = event?.features?.[0] as MapPressFeature | undefined;
        if (!feature) return;

        const roomId = getRoomId(feature);
        if (!roomId || !onPressRoom) return;

        onPressRoom(roomId);
        const shouldSetDestinationFromRoom = Boolean(fromQuery) && !toQuery;
        if (shouldSetDestinationFromRoom) {
            invalidatePendingPoiSelection();
        }

        let nodeId = feature.properties?.nodeID;
        if (typeof nodeId !== "string") {
            return;
        }


        if (nodeId.trim() === "") {
            let latitude: number | undefined;
            let longitude: number | undefined;

            if (event?.coordinates) {
                ({ latitude, longitude } = event.coordinates);
            }
            else if (event?.geometry?.type === "Point") {
                [longitude, latitude] = event.geometry.coordinates;
            }

            if (
                typeof latitude !== "number" ||
                typeof longitude !== "number"
            ) {
                console.error("Invalid coordinates");
                return;
            }
                const g = await findNearestIndoorNode(longitude, latitude);
            if (!g) {return;}
                nodeId = g;
        }
        if (!fromQuery) {
            setFromNodeId(String(nodeId));
            setFromQuery(String(nodeId));
        } else if (!toQuery) {
            setToQuery(String(nodeId));
            setToNodeId(String(nodeId));
        }
    };
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
            shape={roomCollectionForLabels ?? rooms}
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

          {activeFloorRouteView.steps.length > 0 && <DirectionsLine
            endpointId='indoor-directions-endpoints'
            lineColor = {accessible ? '#2196F3' : undefined }
            useIndoorData={true}
            IndoorDirections={activeFloorRouteView.steps}
            lineWidth={5}
            directions={{
                polyline: "",
                distanceMeters: 30,
                durationSeconds: 20,
                steps:[]
            }}
          />}

          <MapboxGL.Images
            images={{
                bee: require('@/assets/images/bee.png')
            }}
          />
          
          {activeFloorRouteView.startTransitionMarker && (
            <MapboxGL.MarkerView
              id="indoor-floor-transition-marker-start"
              coordinate={activeFloorRouteView.startTransitionMarker.coordinate}
            >
              <Image
                source={
                  activeFloorRouteView.startTransitionMarker.icon === 'downarrow'
                    ? require('@/assets/images/downarrow.png')
                    : require('@/assets/images/uparrow.png')
                }
                style={styles.transitionMarkerIcon}
              />
            </MapboxGL.MarkerView>
          )}

          {activeFloorRouteView.endTransitionMarker && (
            <MapboxGL.MarkerView
              id="indoor-floor-transition-marker-end"
              coordinate={activeFloorRouteView.endTransitionMarker.coordinate}
            >
              <Image
                source={
                  activeFloorRouteView.endTransitionMarker.icon === 'downarrow'
                    ? require('@/assets/images/downarrow.png')
                    : require('@/assets/images/uparrow.png')
                }
                style={styles.transitionMarkerIcon}
              />
            </MapboxGL.MarkerView>
          )}

          {(currentNode || userLocation) && (
            <MapboxGL.ShapeSource 
              id="user-location-source" 
              shape={convertCoordinatesToFeature(
                currentNode 
                  ? [currentNode.longitude, currentNode.latitude] 
                  : userLocation!
              )}
            >
              <MapboxGL.SymbolLayer
                id="indoor-user-location-icon"
                aboveLayerID={activeFloorRouteView.steps.length > 0 ? 'indoor-directions-endpoints' : 'indoor-rooms-outline'}
                style={{
                  iconImage: 'bee',
                  iconSize: 0.25,
                  iconAllowOverlap: true,
                  iconAnchor: 'center',
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {poiFeatures.map((poi, index) => {
            const rawCoordinates = poi.geometry.type === 'Point'
              ? (poi.geometry as GeoJSON.Point).coordinates
              : getGeometryCenter(poi.geometry);
            const coords: [number, number] = [rawCoordinates[0], rawCoordinates[1]];

            const poiId = String(poi.properties?.id || `poi-fallback-${index}`);
            const poiType = poi.properties?.type as string;
            const poiLabel = getPoiLabel({
              id: poi.id as string | number,
              properties: poi.properties as RoomFeatureProperties,
            });

            return (
              <MapboxGL.MarkerView
                key={`poi-${poiId}`}
                id={`poi-${poiId}`}
                coordinate={coords}
              >
                <Pressable
                  testID={`indoor-poi-marker-${poiId}`}
                  style={styles.poiPressable}
                  onPress={() => {
                    if (indoorSteps) return;
                    void applyPoiAsDestination({
                      label: poiLabel,
                      coordinates: coords,
                      mapContextKey,
                    });
                  }}
                >
                  <POIMarker type={poiType} label={poiLabel} size={22} />
                </Pressable>
              </MapboxGL.MarkerView>
            );
          })}

          <RoomLabelLayer rooms={roomCollectionForLabels} selectedRoomId={selectedRoomId}/>
        </MapboxGL.MapView>
      ) : (
        <Text style={styles.placeholderText}>Floor plan viewer loading...</Text>
      )}

      {indoorSteps && (
        <View style={styles.directionStepsContainer} pointerEvents="box-none">
          <DirectionsModal  
            visible={true}
            steps={indoorSteps}
            origin={fromQuery}
            destination={toQuery}
            onCurrentNodeChange={(node) => {
                setCurrentNode(node);
                if (node.floor) onStepFloorChange?.(node.floor);
                const coordinates = [node.longitude, node.latitude];
                if (coordinates) cameraRef.current?.setCamera({
                    centerCoordinate: coordinates,
                    zoomLevel: 21,
                    padding: { paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: 200},
                    animationDuration: 500
                });
            }}
            onClose={() => {
                setToQuery('');
                setToNodeId(null);
                invalidatePendingPoiSelection();
            }}
            preStartLabel={accessible ? "Navigate" : undefined}
          />
        </View>
      )}

      {!indoorSteps && (
        <View style={styles.directionBarContainer} pointerEvents="box-none">
          <DirectionBar
            mapsAdapter={nodeAdapter}
            fromValue={fromQuery}
            toValue={toQuery}
            onChangeFrom={setFromQuery}
            onChangeTo={(text) => {
              setToQuery(text);
              invalidatePendingPoiSelection();
            }}
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
              invalidatePendingPoiSelection();
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
              invalidatePendingPoiSelection();
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
              invalidatePendingPoiSelection();
            }}
            onClose={() => {
              setFromQuery('');
              setFromNodeId(null);
              setToQuery('');
              setToNodeId(null);
              invalidatePendingPoiSelection();
            }}
            fromPlaceholder="From room (e.g. H8.835)"
            toPlaceholder="To room (e.g. H8.841)"
          />
          <View style={styles.accessibilityToggleContainer}>
            <AccessibilityToggle
              enabled={accessible}
              onToggle={setAccessible}
            />
          </View>
        </View>
      )}

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
    },
    directionStepsContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    accessibilityToggleContainer: {
        position: 'relative',
        marginTop: 10,
        marginLeft: 10,
        zIndex: 1000,
    },
    poiPressable: {
      padding: 2,
      borderRadius: 12,
    },
    transitionMarkerIcon: {
        width: 24,
        height: 24,
    },
});
