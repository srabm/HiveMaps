import React, { useMemo } from 'react';

import { MapboxGL } from '@/services/mapbox';
import type { DirectionsResponse } from '@/services/maps/directions-api-adapter';
import {
  buildRouteVisualSegments,
  type NavigationModeLabel,
} from '@/services/maps/route-visuals';
import { RouteInfoCard } from '@/components/ui/route-info-card';

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
        <RouteInfoCard
          distanceMeters={directions.distanceMeters}
          durationSeconds={directions.durationSeconds}
          position={infoCardPosition}
        />
      )}
    </>
  );
}
