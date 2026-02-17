import React from 'react';
import {Text, View, StyleSheet} from 'react-native';
import {MapboxGL} from '@/services/mapbox';
import {DirectionsLine} from '@/components/ui/directions-line';
import type {DirectionsResponse} from '@/services/maps/directions-api-adapter';
import type {ShuttleStop} from '@/services/data/shuttle-stops';

type ShuttleRouteOverlayProps = {
    walkToStop: DirectionsResponse | null;
    shuttleLeg: DirectionsResponse | null;
    walkFromStop: DirectionsResponse | null;
    stopsForTrip: {originStop: ShuttleStop; destinationStop: ShuttleStop} | null;
    stopMarkers: Record<'SGW' | 'LOY', ShuttleStop>;
};

export function ShuttleRouteOverlay({
    walkToStop,
    shuttleLeg,
    walkFromStop,
    stopsForTrip,
    stopMarkers,
}: ShuttleRouteOverlayProps) {
    return (
        <>
            {walkToStop && (
                <DirectionsLine
                    directions={walkToStop}
                    infoCardPosition="top"
                    lineColor="#6B7280"
                    lineWidth={6}
                    showInfoCard={false}
                    lineDasharray={[2, 2]}
                    sourceId="shuttle-walk-to-source"
                    layerId="shuttle-walk-to-layer"
                />
            )}
            {shuttleLeg && (
                <DirectionsLine
                    directions={shuttleLeg}
                    infoCardPosition="top"
                    lineColor="#e5a712"
                    lineWidth={7}
                    showInfoCard={false}
                    sourceId="shuttle-leg-source"
                    layerId="shuttle-leg-layer"
                />
            )}
            {walkFromStop && (
                <DirectionsLine
                    directions={walkFromStop}
                    infoCardPosition="top"
                    lineColor="#6B7280"
                    lineWidth={6}
                    showInfoCard={false}
                    lineDasharray={[2, 2]}
                    sourceId="shuttle-walk-from-source"
                    layerId="shuttle-walk-from-layer"
                />
            )}
            {stopsForTrip && (
                <>
                    <MapboxGL.PointAnnotation
                        id="shuttle-stop-sgw"
                        coordinate={[
                            stopMarkers.SGW.coordinate.longitude,
                            stopMarkers.SGW.coordinate.latitude,
                        ]}
                    >
                        <View style={styles.shuttleStopMarker}>
                            <Text style={styles.shuttleStopText}>SGW</Text>
                        </View>
                    </MapboxGL.PointAnnotation>
                    <MapboxGL.PointAnnotation
                        id="shuttle-stop-loy"
                        coordinate={[
                            stopMarkers.LOY.coordinate.longitude,
                            stopMarkers.LOY.coordinate.latitude,
                        ]}
                    >
                        <View style={styles.shuttleStopMarker}>
                            <Text style={styles.shuttleStopText}>LOY</Text>
                        </View>
                    </MapboxGL.PointAnnotation>
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    shuttleStopMarker: {
        backgroundColor: '#9d1e30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    shuttleStopText: {color: '#ffffff', fontSize: 10, fontWeight: '700'},
});
