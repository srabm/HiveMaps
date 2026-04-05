import React, {useMemo} from 'react';
import {MapboxGL} from '@/services/mapbox';
import type {DirectionsResponse} from '@/services/maps/directions-api-adapter';
import { IndoorDirectionsResponse } from '@/services/http/indoor-api';
import { RouteInfoCard } from '@/components/ui/route-info-card';

type Position = [number, number];

interface DirectionsDisplayProps {
    directions: DirectionsResponse;
    coordinatesOverride?: Position[];
    sourceId?: string;
    layerId?: string;
    endpointId?: string;
    lineColor?: string;
    lineWidth?: number;
    infoCardPosition?: 'top' | 'bottom';
    showInfoCard?: boolean;
    showEndpoints?: boolean;
    lineDasharray?: number[];
    useIndoorData?:boolean;
    IndoorDirections?: IndoorDirectionsResponse[];
    showStartEndpoint?: boolean;
    showEndEndpoint?: boolean;
}

const SOLID_LINE_DASHARRAY = [1, 0] as const;

/**
 * Black magic to convert polyline to geojson
 * @param encoded
 */
const decodePolyline = (encoded: string): Position[] => {
    const points: Position[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte: number;

        do {
            byte = (encoded.codePointAt(index++) ?? 0) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        result = 0;
        shift = 0;
        do {
            byte = (encoded.codePointAt(index++) ?? 0) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        points.push([lng / 1e5, lat / 1e5]);
    }

    return points;
};

const dedupeConsecutiveCoordinates = (points: Position[]): Position[] => {
    if (points.length === 0) return points;

    const deduped: Position[] = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
        const current = points[index];
        const previous = deduped.at(-1);
        if (previous && current[0] === previous[0] && current[1] === previous[1]) continue;
        deduped.push(current);
    }

    return deduped;
};

export function DirectionsLine({
                                   directions,
                                   coordinatesOverride,
                                   sourceId = 'directions-source',
                                   layerId = 'directions-layer',
                                   endpointId,
                                   lineColor = '#e5a712',
                                   lineWidth = 10,
                                   infoCardPosition = 'bottom',
                                   showInfoCard = true,
                                   showEndpoints = true,
                                   lineDasharray,
                                   useIndoorData = false,
                                   IndoorDirections,
                                   showStartEndpoint = true,
                                   showEndEndpoint = true,
                               }: Readonly<DirectionsDisplayProps>) {


    const coordinates = useMemo(() => {
        if (coordinatesOverride?.length) {
            return dedupeConsecutiveCoordinates(coordinatesOverride);
        }

        if (useIndoorData && IndoorDirections) {
            return IndoorDirections.flatMap((step) =>
                step.nodes.map((node) => [node.longitude, node.latitude] as [number, number])
            );
        }

        if (directions) {
            return decodePolyline(directions.polyline);
        }

        return [];
    }, [coordinatesOverride, directions, IndoorDirections, useIndoorData]);

    const featureCollection = useMemo(
        () => {
            if (!coordinates.length) {
                return {
                    type: 'FeatureCollection' as const,
                    features: [],
                };
            }
            return {
                type: 'FeatureCollection' as const,
                features: [
                    {
                        type: 'Feature' as const,
                        geometry: {type: 'LineString' as const, coordinates},
                        properties: {},
                    },
                ],
            };
        },
        [coordinates],
    );

    const endpointsCollection = useMemo(
        () => {
            if (!coordinates.length) {
                return {
                    type: 'FeatureCollection' as const,
                    features: [],
                };
            }
            return {
                type: 'FeatureCollection' as const,
                features: [
                    ...(showStartEndpoint ? [{
                        type: 'Feature' as const,
                        id: 'start-point',
                        geometry: {type: 'Point' as const, coordinates: coordinates[0]},
                        properties: {type: 'start'},
                    }] : []),
                    ...(showEndEndpoint ? [{
                        type: 'Feature' as const,
                        id: 'end-point',
                        geometry: {type: 'Point' as const, coordinates: coordinates[coordinates.length - 1]},
                        properties: {type: 'end'},
                    }] : []),
                ],
            };
        },
        [coordinates, showEndEndpoint, showStartEndpoint],
    );

    if (!coordinates.length) return null;

    return (
        <>
            <MapboxGL.ShapeSource id={sourceId} shape={featureCollection}>
                <MapboxGL.LineLayer
                    id={layerId}
                    style={{
                        lineColor,
                        lineWidth,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineDasharray: lineDasharray ?? [...SOLID_LINE_DASHARRAY],
                    }}
                />
            </MapboxGL.ShapeSource>

            {showEndpoints && (
                <MapboxGL.ShapeSource id={`${sourceId}-endpoints`} shape={endpointsCollection}>
                    <MapboxGL.CircleLayer
                        id={endpointId || `${layerId}-endpoints`}
                        style={{
                            circleColor: lineColor,
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
