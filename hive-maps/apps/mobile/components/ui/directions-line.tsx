import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MapboxGL} from '@/services/mapbox';
import type {DirectionsResponse, Step} from '@/services/maps/directions-api-adapter';
import {TransportMode} from '@/services/maps/directions-api-adapter';
import {IndoorDirectionsResponse} from '@/services/http/indoor-api';

type Position = [number, number];

// ---------------------------------------------------------------------------
// Line style constants
// ---------------------------------------------------------------------------
const WALKING_COLOR = '#6B7280';
const DRIVING_COLOR = '#e5a712';
const WALKING_DASH: number[] = [2, 2];
const ACCESSIBLE_INDOOR_COLOR = '#9d1e30';

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
    useIndoorData?: boolean;
    IndoorDirections?: IndoorDirectionsResponse[];
    showStartEndpoint?: boolean;
    showEndEndpoint?: boolean;
    /** Controls automatic line styling per mode. Omit to keep legacy prop-driven behaviour. */
    transportMode?: TransportMode;
    /** Explicitly marks the indoor route as accessible (wheelchair). When set,
     *  overrides the node-level wheelchairAccessible inference for indoor styling. */
    accessible?: boolean;
}

// ---------------------------------------------------------------------------
// Polyline decoder
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDistance = (meters: number) =>
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

const dedupeConsecutiveCoordinates = (points: Position[]): Position[] => {
    if (points.length === 0) return points;
    const deduped: Position[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const previous = deduped.at(-1);
        if (previous && current[0] === previous[0] && current[1] === previous[1]) continue;
        deduped.push(current);
    }
    return deduped;
};

function toFeatureCollection(coordinates: Position[]) {
    if (!coordinates.length) return {type: 'FeatureCollection' as const, features: []};
    return {
        type: 'FeatureCollection' as const,
        features: [{
            type: 'Feature' as const,
            geometry: {type: 'LineString' as const, coordinates},
            properties: {},
        }],
    };
}

// ---------------------------------------------------------------------------
// Transit multi-segment rendering
// ---------------------------------------------------------------------------
interface TransitSegment {
    coordinates: Position[];
    color: string;
    dasharray?: number[];
}

function buildTransitSegments(steps: Step[], fallbackColor: string): TransitSegment[] {
    const segments: TransitSegment[] = [];

    for (const step of steps) {
        if (!step.polyline) continue;
        const coordinates = dedupeConsecutiveCoordinates(decodePolyline(step.polyline));
        if (!coordinates.length) continue;

        const isTransitStep = Boolean(step.transitDetails);
        const transitColor: string =
            step.transitDetails?.transitLine?.color ?? fallbackColor;

        segments.push({
            coordinates,
            color: isTransitStep ? transitColor : WALKING_COLOR,
            dasharray: isTransitStep ? undefined : WALKING_DASH,
        });
    }

    return segments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DirectionsLine({
    directions,
    coordinatesOverride,
    sourceId = 'directions-source',
    layerId = 'directions-layer',
    endpointId,
    lineColor = DRIVING_COLOR,
    lineWidth = 10,
    infoCardPosition = 'bottom',
    showInfoCard = true,
    showEndpoints = true,
    lineDasharray,
    useIndoorData = false,
    IndoorDirections,
    showStartEndpoint = true,
    showEndEndpoint = true,
    transportMode,
    accessible,
}: Readonly<DirectionsDisplayProps>) {

    // -----------------------------------------------------------------------
    // Resolve indoor accessibility flag
    // -----------------------------------------------------------------------
    const isAccessibleIndoor = useMemo(() => {
        if (!useIndoorData || !IndoorDirections) return false;
        // Explicit prop takes precedence; fall back to node-level flag
        if (accessible !== undefined) return accessible;
        return IndoorDirections.some((step) =>
            step.nodes.some((node) => node.wheelchairAccessible),
        );
    }, [useIndoorData, IndoorDirections, accessible]);

    // -----------------------------------------------------------------------
    // Derive effective line style from transportMode (when provided)
    // -----------------------------------------------------------------------
    const effectiveColor = useMemo(() => {
        if (transportMode === undefined) return lineColor;
        if (useIndoorData) {
            return isAccessibleIndoor ? ACCESSIBLE_INDOOR_COLOR : WALKING_COLOR;
        }
        switch (transportMode) {
            case TransportMode.WALKING: return WALKING_COLOR;
            case TransportMode.DRIVING: return DRIVING_COLOR;
            case TransportMode.TRANSIT: return DRIVING_COLOR; // fallback; transit uses per-segment colours
            default: return lineColor;
        }
    }, [transportMode, lineColor, useIndoorData, isAccessibleIndoor]);

    const effectiveDash = useMemo(() => {
        if (transportMode === undefined) return lineDasharray;
        if (useIndoorData) return WALKING_DASH; // indoor is always dashed
        switch (transportMode) {
            case TransportMode.WALKING: return WALKING_DASH;
            case TransportMode.DRIVING: return undefined;
            case TransportMode.TRANSIT: return undefined; // per-segment
            default: return lineDasharray;
        }
    }, [transportMode, lineDasharray, useIndoorData]);

    // -----------------------------------------------------------------------
    // Coordinates for the main (non-transit) path
    // -----------------------------------------------------------------------
    const coordinates = useMemo(() => {
        if (coordinatesOverride?.length) {
            return dedupeConsecutiveCoordinates(coordinatesOverride);
        }
        if (useIndoorData && IndoorDirections) {
            return IndoorDirections.flatMap((step) =>
                step.nodes.map((node) => [node.longitude, node.latitude] as Position),
            );
        }
        if (directions) {
            return decodePolyline(directions.polyline);
        }
        return [];
    }, [coordinatesOverride, directions, IndoorDirections, useIndoorData]);

    // -----------------------------------------------------------------------
    // Transit segments (only when mode is TRANSIT and steps have per-step polylines)
    // -----------------------------------------------------------------------
    const transitSegments = useMemo<TransitSegment[]>(() => {
        if (transportMode !== TransportMode.TRANSIT) return [];
        if (coordinatesOverride?.length) return []; // caller controls coords directly
        if (!directions?.steps?.length) return [];
        const stepsWithPolylines = directions.steps.filter((s) => s.polyline);
        if (!stepsWithPolylines.length) return [];
        return buildTransitSegments(directions.steps, DRIVING_COLOR);
    }, [transportMode, directions, coordinatesOverride]);

    const useTransitSegments = transitSegments.length > 0;

    // -----------------------------------------------------------------------
    // Endpoint dots (use main coordinates or first/last transit segment)
    // -----------------------------------------------------------------------
    const endpointCoordinates = useMemo(() => {
        if (useTransitSegments) {
            const first = transitSegments[0]?.coordinates[0];
            const lastSeg = transitSegments.at(-1);
            const last = lastSeg?.coordinates.at(-1);
            if (first && last) return {start: first, end: last};
        }
        if (!coordinates.length) return null;
        return {start: coordinates[0], end: coordinates[coordinates.length - 1]};
    }, [coordinates, transitSegments, useTransitSegments]);

    const endpointsCollection = useMemo(() => {
        if (!endpointCoordinates) return {type: 'FeatureCollection' as const, features: []};
        const {start, end} = endpointCoordinates;
        return {
            type: 'FeatureCollection' as const,
            features: [
                ...(showStartEndpoint ? [{
                    type: 'Feature' as const,
                    id: 'start-point',
                    geometry: {type: 'Point' as const, coordinates: start},
                    properties: {type: 'start'},
                }] : []),
                ...(showEndEndpoint ? [{
                    type: 'Feature' as const,
                    id: 'end-point',
                    geometry: {type: 'Point' as const, coordinates: end},
                    properties: {type: 'end'},
                }] : []),
            ],
        };
    }, [endpointCoordinates, showStartEndpoint, showEndEndpoint]);

    const featureCollection = useMemo(
        () => toFeatureCollection(coordinates),
        [coordinates],
    );

    // -----------------------------------------------------------------------
    // Nothing to render guard
    // -----------------------------------------------------------------------
    if (!useTransitSegments && !coordinates.length) return null;
    if (useTransitSegments && transitSegments.length === 0) return null;

    const endpointDotColor = useTransitSegments ? WALKING_COLOR : effectiveColor;

    return (
        <>
            {/* ── Transit: one layer per step segment ── */}
            {useTransitSegments
                ? transitSegments.map((seg, i) => (
                    <MapboxGL.ShapeSource
                        key={`${sourceId}-transit-${i}`}
                        id={`${sourceId}-transit-${i}`}
                        shape={toFeatureCollection(seg.coordinates)}
                    >
                        <MapboxGL.LineLayer
                            id={`${layerId}-transit-${i}`}
                            style={{
                                lineColor: seg.color,
                                lineWidth,
                                lineCap: 'round',
                                lineJoin: 'round',
                                ...(seg.dasharray ? {lineDasharray: seg.dasharray} : {}),
                            }}
                        />
                    </MapboxGL.ShapeSource>
                ))
                /* ── All other modes: single layer ── */
                : (
                    <MapboxGL.ShapeSource id={sourceId} shape={featureCollection}>
                        <MapboxGL.LineLayer
                            id={layerId}
                            style={{
                                lineColor: effectiveColor,
                                lineWidth,
                                lineCap: 'round',
                                lineJoin: 'round',
                                ...(effectiveDash ? {lineDasharray: effectiveDash} : {}),
                            }}
                        />
                    </MapboxGL.ShapeSource>
                )
            }

            {/* ── Endpoint dots ── */}
            {showEndpoints && endpointCoordinates && (
                <MapboxGL.ShapeSource id={`${sourceId}-endpoints`} shape={endpointsCollection}>
                    <MapboxGL.CircleLayer
                        id={endpointId || `${layerId}-endpoints`}
                        style={{
                            circleColor: endpointDotColor,
                            circleRadius: 8,
                            circleStrokeColor: '#ffffff',
                            circleStrokeWidth: 2,
                        }}
                    />
                </MapboxGL.ShapeSource>
            )}

            {/* ── Info card ── */}
            {showInfoCard && (
                <View
                    style={[
                        styles.infoCard,
                        infoCardPosition === 'top' ? styles.infoCardTop : styles.infoCardBottom,
                    ]}
                >
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Distance</Text>
                        <Text style={styles.infoValue}>
                            {formatDistance(directions.distanceMeters)}
                        </Text>
                    </View>
                    <View style={styles.divider}/>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>
                            {formatDuration(directions.durationSeconds)}
                        </Text>
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
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 6,
        elevation: 4,
    },
    infoCardTop: {top: 20},
    infoCardBottom: {bottom: 20},
    infoItem: {flex: 1, alignItems: 'center'},
    infoLabel: {fontSize: 12, color: '#6B7280', marginBottom: 4},
    infoValue: {fontSize: 18, fontWeight: '600', color: '#111827'},
    divider: {width: 1, height: 32, backgroundColor: '#E5E7EB'},
});