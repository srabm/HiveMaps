import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MapboxGL } from '@/services/mapbox';
import type { DirectionsResponse } from '@/services/maps/directions-api-adapter';
import {
  buildRouteVisualSegments,
  type NavigationModeLabel,
} from '@/services/maps/route-visuals';

type Position = [number, number];

type SegmentedDirectionsLineProps = {
  directions: DirectionsResponse;
  mode: NavigationModeLabel;
  sourceIdPrefix?: string;
  infoCardPosition?: 'top' | 'bottom';
  showInfoCard?: boolean;
  showEndpoints?: boolean;
  showStartEndpoint?: boolean;
  showEndEndpoint?: boolean;
};

const SOLID_LINE_DASHARRAY = [1, 0] as const;

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

const toLineFeatureCollection = (coordinates: Position[]) => ({
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates },
      properties: {},
    },
  ],
});

export function SegmentedDirectionsLine({
  directions,
  mode,
  sourceIdPrefix = 'directions-segmented',
  infoCardPosition = 'bottom',
  showInfoCard = true,
  showEndpoints = true,
  showStartEndpoint = true,
  showEndEndpoint = true,
}: Readonly<SegmentedDirectionsLineProps>) {
  const segments = useMemo(
    () => buildRouteVisualSegments(directions, mode),
    [directions, mode],
  );

  const endpointsCollection = useMemo(() => {
    const firstCoordinate = segments[0]?.coordinates[0];
    const lastSegment = segments[segments.length - 1];
    const lastCoordinate = lastSegment?.coordinates[lastSegment.coordinates.length - 1];

    if (!firstCoordinate || !lastCoordinate) {
      return null;
    }

    return {
      type: 'FeatureCollection' as const,
      features: [
        ...(showStartEndpoint
          ? [
              {
                type: 'Feature' as const,
                id: 'start-point',
                geometry: { type: 'Point' as const, coordinates: firstCoordinate },
                properties: { type: 'start' },
              },
            ]
          : []),
        ...(showEndEndpoint
          ? [
              {
                type: 'Feature' as const,
                id: 'end-point',
                geometry: { type: 'Point' as const, coordinates: lastCoordinate },
                properties: { type: 'end' },
              },
            ]
          : []),
      ],
    };
  }, [segments, showEndEndpoint, showStartEndpoint]);

  if (segments.length === 0) return null;

  const endpointColor = segments[0]?.color ?? '#e5a712';

  return (
    <>
      {segments.map((segment, index) => (
        <MapboxGL.ShapeSource
          key={`${sourceIdPrefix}-source-${index}`}
          id={`${sourceIdPrefix}-source-${index}`}
          shape={toLineFeatureCollection(segment.coordinates)}
        >
          <MapboxGL.LineLayer
            id={`${sourceIdPrefix}-line-${index}`}
            style={{
              lineColor: segment.color,
              lineWidth: segment.lineWidth,
              lineCap: 'round',
              lineJoin: 'round',
              lineDasharray: segment.lineDasharray ?? [...SOLID_LINE_DASHARRAY],
            }}
          />
        </MapboxGL.ShapeSource>
      ))}

      {showEndpoints && endpointsCollection && (
        <MapboxGL.ShapeSource id={`${sourceIdPrefix}-endpoints-source`} shape={endpointsCollection}>
          <MapboxGL.CircleLayer
            id={`${sourceIdPrefix}-endpoints-layer`}
            style={{
              circleColor: endpointColor,
              circleRadius: 8,
              circleStrokeColor: '#ffffff',
              circleStrokeWidth: 2,
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {showInfoCard && (
        <View
          style={[
            styles.infoCard,
            infoCardPosition === 'top' ? styles.infoCardTop : styles.infoCardBottom,
          ]}
        >
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{formatDistance(directions.distanceMeters)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatDuration(directions.durationSeconds)}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  infoCardTop: { top: 20 },
  infoCardBottom: { bottom: 20 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: '600', color: '#111827' },
  divider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
});
