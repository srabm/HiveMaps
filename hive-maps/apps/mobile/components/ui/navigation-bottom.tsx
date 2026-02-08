import React, {useState, useRef, useEffect, useMemo} from 'react';
import {View, Text, Pressable, StyleSheet, Animated} from 'react-native';
import {
    getDirections,
    TransportMode,
    DirectionsResponse,
    DirectionsRequest,
    Coordinate,
} from '@/services/maps/directions-api-adapter';

type TransportModeLabel = 'Drive' | 'Walk' | 'Transit' | 'Bike';

interface NavigationBottomProps {
    origin: Coordinate;
    destination: Coordinate;
    onDirectionsChange?: (directions: DirectionsResponse) => void;
    onStartPress?: () => void;
    onModeChange?: (mode: TransportModeLabel) => void;
    initialMode?: TransportModeLabel;
    arrivalTime?: string;
}

const MODES: TransportModeLabel[] = ['Drive', 'Walk', 'Transit', 'Bike'];

const mapUiModeToTransportMode = (mode: TransportModeLabel) => {
    switch (mode) {
        case 'Drive':
            return TransportMode.DRIVING;
        case 'Walk':
            return TransportMode.WALKING;
        case 'Transit':
            return TransportMode.TRANSIT;
        case 'Bike':
            return TransportMode.BIKING;
        default:
            return TransportMode.WALKING;
    }
};

const mapUiModeToProvider = (mode: TransportModeLabel) => {
    const {Provider} = require('@/services/maps/directions-api-adapter');
    return mode === 'Transit' ? Provider.GOOGLE_MAPS : Provider.MAPBOX;
};

const formatDistance = (meters?: number) => {
    if (meters == null) return '—';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
};

const formatDuration = (seconds?: number) => {
    if (seconds == null) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

export function NavigationBottom({
                                     origin,
                                     destination,
                                     onDirectionsChange,
                                     onStartPress,
                                     onModeChange,
                                     initialMode = 'Drive',
                                     arrivalTime = 'Arrive by 10:27 PM',
                                 }: NavigationBottomProps) {
    const [selectedMode, setSelectedMode] = useState<TransportModeLabel>(initialMode);
    const [directions, setDirections] = useState<DirectionsResponse | null>(null);
    const slideAnim = useRef(new Animated.Value(MODES.indexOf(initialMode))).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: MODES.indexOf(selectedMode),
            useNativeDriver: false,
            speed: 12,
            bounciness: 8,
        }).start();
    }, [selectedMode, slideAnim]);

    useEffect(() => {
        let active = true;
        const fetchDirections = async () => {
            try {
                const {Provider} = require('@/services/maps/directions-api-adapter');
                const request: DirectionsRequest = {
                    origin,
                    destination,
                    transportMode: mapUiModeToTransportMode(selectedMode),
                    provider: mapUiModeToProvider(selectedMode),
                };
                const resp = await getDirections(request);
                if (!active) return;
                setDirections(resp);
                onDirectionsChange?.(resp);
            } catch (err) {
                console.warn('Failed to load directions', err);
            }
        };
        fetchDirections();
        return () => {
            active = false;
        };
    }, [origin, destination, selectedMode, onDirectionsChange]);

    const handleModeChange = (mode: TransportModeLabel) => {
        setSelectedMode(mode);
        onModeChange?.(mode);
    };

    const indicatorWidth = slideAnim.interpolate({
        inputRange: [0, 3],
        outputRange: ['25%', '25%'],
    });

    const indicatorLeft = slideAnim.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: ['0%', '25%', '50%', '75%'],
    });

    const durationText = formatDuration(directions?.durationSeconds);
    const distanceText = formatDistance(directions?.distanceMeters);
    const durationParts = useMemo(() => durationText.split(' '), [durationText]);
    const durationValue = durationParts[0] ?? durationText;
    const durationUnit = durationParts[1] ?? 'min';

    return (
        <View style={styles.navCard}>
            <View style={styles.navHeaderRow}>
                <Text style={styles.navHeaderText}>{selectedMode}</Text>
            </View>

            <View style={styles.modeBarContainer}>
                <Animated.View
                    style={[
                        styles.modeIndicator,
                        {
                            width: indicatorWidth,
                            left: indicatorLeft,
                        },
                    ]}
                />
                {MODES.map((mode, index) => (
                    <Pressable
                        key={mode}
                        onPress={() => handleModeChange(mode)}
                        style={[styles.modeOption, index !== MODES.length - 1 && styles.modeBorder]}
                    >
                        <Text
                            style={[
                                styles.modeOptionText,
                                selectedMode === mode && styles.modeOptionTextActive,
                            ]}
                        >
                            {mode}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.metricsRow}>
                <View style={[styles.metricCell, styles.durationCell]}>
                    <Text style={styles.durationValue}>{durationValue}</Text>
                    <Text style={styles.durationUnit}>{durationUnit}</Text>
                </View>

                <View style={[styles.metricCell, styles.middleCell]}>
                    <Text style={styles.arrivalText} numberOfLines={1} ellipsizeMode="tail">
                        {arrivalTime}
                    </Text>
                    <Text style={styles.distanceText}>{distanceText}</Text>
                </View>

                <View style={[styles.metricCell, styles.startCell]}>
                    <Pressable style={styles.startButton} onPress={onStartPress}>
                        <Text style={styles.startButtonText}>Start</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    navCard: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 20,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 6,
        elevation: 6,
    },
    navHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    navHeaderText: {fontSize: 16, fontWeight: '700', color: '#111827'},
    navArrival: {fontSize: 12, color: '#10B981', fontWeight: '600'},
    modeBarContainer: {
        position: 'relative',
        flexDirection: 'row',
        backgroundColor: '#9d1e30',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        height: 44,
    },
    modeIndicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: '#e5a712',
        borderRadius: 12,
    },
    modeOption: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeBorder: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.2)',
    },
    modeOptionText: {fontSize: 13, fontWeight: '600', color: '#FFFFFF'},
    modeOptionTextActive: {color: '#111827'},
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 4,
    },
    metricCell: {
        justifyContent: 'center',
    },
    durationCell: {
        flex: 1,
        alignItems: 'center',
    },
    middleCell: {
        flex: 3,
        alignItems: 'flex-start',
    },
    startCell: {
        flex: 1,
        alignItems: 'flex-end',
    },
    durationValue: {fontSize: 20, fontWeight: '700', color: '#10B981'},
    durationUnit: {fontSize: 12, color: '#10B981', fontWeight: '600'},
    arrivalText: {fontSize: 13, color: '#111827', fontWeight: '600'},
    distanceText: {fontSize: 12, color: '#6B7280', marginTop: 4},
    startButton: {
        backgroundColor: '#9d1e30',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    startButtonText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
});
