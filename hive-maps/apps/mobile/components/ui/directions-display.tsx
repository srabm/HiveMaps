import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MapboxGL} from '@/services/mapbox';
import type {DirectionsResponse} from '@/services/maps/maps-api-adapter';

type Position = [number, number];

interface DirectionsDisplayProps {
    directions: DirectionsResponse;
    sourceId?: string;
    layerId?: string;
    lineColor?: string;
    lineWidth?: number;
    infoCardPosition?: 'top' | 'bottom';
}

/**
 * Black magic voodoo to convert polyline to geojson
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
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        result = 0;
        shift = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        points.push([lng / 1e5, lat / 1e5]);
    }

    return points;
};

const formatDistance = (meters: number) =>
    meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

export function DirectionsDisplay({
                                      directions,
                                      sourceId = 'directions-source',
                                      layerId = 'directions-layer',
                                      lineColor = '#2B6EF2',
                                      lineWidth = 5,
                                      infoCardPosition = 'bottom',
                                  }: DirectionsDisplayProps) {
    const coordinates = useMemo(
        () => decodePolyline(directions.polyline),
        [directions.polyline],
    );

    if (!coordinates.length) return null;

    const featureCollection = useMemo(
        () => ({
            type: 'FeatureCollection' as const,
            features: [
                {
                    type: 'Feature' as const,
                    geometry: {type: 'LineString' as const, coordinates},
                    properties: {},
                },
            ],
        }),
        [coordinates],
    );

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
                    }}
                />
            </MapboxGL.ShapeSource>

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

