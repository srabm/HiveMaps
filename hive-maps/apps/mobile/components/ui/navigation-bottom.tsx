import React, {useState, useRef, useEffect, useMemo} from 'react';
import {View, Text, Pressable, StyleSheet, Animated} from 'react-native';
import {
    getDirections,
    TransportMode,
    DirectionsResponse,
    DirectionsRequest,
    Coordinate,
    Provider,
    TimeFilterMode,
} from '@/services/maps/directions-api-adapter';
import {TimePickerModal} from './TimePickerModal';
import {formatISOToTime, getCurrentTimeISO} from '@/utils/timeFormatter';

type TransportModeLabel = 'Drive' | 'Walk' | 'Transit' | 'Bike';


interface NavigationBottomProps {
    origin: Coordinate;
    destination: Coordinate;
    onDirectionsChange?: (directions: DirectionsResponse) => void;
    onStartPress?: () => void;
    onModeChange?: (mode: TransportModeLabel) => void;
    initialMode?: TransportModeLabel;
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
    return mode === 'Transit' ? Provider.GOOGLE_MAPS : Provider.MAPBOX;
};

const formatDistance = (meters?: number) => {
    if (meters == null) return '—';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
};

const formatDuration = (seconds?: number) => {
    if (seconds == null) return '— min';
    const totalMinutes = Math.round(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours) {
        const paddedMinutes = String(minutes).padStart(2, '0');
        return `${hours}:${paddedMinutes} hr`;
    }
    return `${minutes} min`;
};

export function NavigationBottom({
                                     origin,
                                     destination,
                                     onDirectionsChange,
                                     onStartPress,
                                     onModeChange,
                                     initialMode = 'Drive',
                                 }: NavigationBottomProps) {
    const [selectedMode, setSelectedMode] = useState<TransportModeLabel>(initialMode);
    const [directions, setDirections] = useState<DirectionsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [timeFilter, setTimeFilter] = useState(getCurrentTimeISO());
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('depart');
    const slideAnim = useRef(new Animated.Value(MODES.indexOf(initialMode))).current;
    const [arriveLeaveDetails, setArriveLeaveDetails] = useState<string>('');

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
            setIsLoading(true);
            setDirections(null);
            try {
                const request: DirectionsRequest = {
                    origin,
                    destination,
                    transportMode: mapUiModeToTransportMode(selectedMode),
                    provider: mapUiModeToProvider(selectedMode),
                    timeFilterMode,
                    timeFilter,
                };
                const directionsResponse = await getDirections(request);
                if (!active) return;
                setDirections(directionsResponse);
                onDirectionsChange?.(directionsResponse);
            } catch (err) {
                if (!active) return;
                setDirections(null);
                console.warn('Failed to load directions', err);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        fetchDirections();
        return () => {
            active = false;
        };
    }, [origin, destination, selectedMode, timeFilter, timeFilterMode, onDirectionsChange]);

    // Calculate arrival/departure details
    useEffect(() => {
        if (!directions) {
            setArriveLeaveDetails('');
            return;
        }

        try {
            if (selectedMode === 'Transit') {
                const steps = directions.steps;

                if (!steps || steps.length === 0) {
                    setArriveLeaveDetails('');
                    return;
                }

                // Find first transit step
                const firstTransitIndex = steps.findIndex(step => step.transitDetails);

                if (firstTransitIndex === -1) {
                    if (timeFilterMode === 'depart') {
                        const arrivalTime = new Date(new Date(timeFilter).getTime() + directions.durationSeconds * 1000);
                        setArriveLeaveDetails(`Arrive by ${formatISOToTime(arrivalTime.toISOString())}`);
                    } else {
                        const departureTime = new Date(new Date(timeFilter).getTime() - directions.durationSeconds * 1000)
                        setArriveLeaveDetails(`Depart at ${formatISOToTime(departureTime.toISOString())}`)
                    }
                    setArriveLeaveDetails('');
                    return;
                }

                // Find last transit step
                let lastTransitIndex = firstTransitIndex;
                for (let i = steps.length - 1; i >= 0; i--) {
                    if (steps[i].transitDetails) {
                        lastTransitIndex = i;
                        break;
                    }
                }

                if (timeFilterMode === 'depart') {
                    // For depart mode: show when you'll ARRIVE if you depart now
                    const firstTransitStep = steps[firstTransitIndex];
                    const departureTimeStr = firstTransitStep.transitDetails?.departureTime;

                    if (!departureTimeStr) {
                        setArriveLeaveDetails('');
                        return;
                    }

                    let firstTransitTime = new Date(departureTimeStr);
                    let initialWalkingDuration = 0;

                    // Sum duration of initial walking steps
                    for (let i = 0; i < firstTransitIndex; i++) {
                        initialWalkingDuration += steps[i].duration;
                    }

                    // Add total trip duration to get arrival time
                    let durationWithoutInitialWalking = directions.durationSeconds - initialWalkingDuration;

                    const arrivalTime = new Date(firstTransitTime.getTime() + durationWithoutInitialWalking * 1000);

                    const formattedTime = formatISOToTime(arrivalTime.toISOString());
                    setArriveLeaveDetails(`Arrive by ${formattedTime}`);
                } else {
                    // For arrive mode: show when you need to DEPART to arrive by that time
                    const lastTransitStep = steps[lastTransitIndex];
                    const arrivalTimeStr = lastTransitStep.transitDetails?.arrivalTime;

                    if (!arrivalTimeStr) {
                        setArriveLeaveDetails('');
                        return;
                    }

                    let lastTransitTime = new Date(arrivalTimeStr)
                    let finalWalkingDuration = 0

                    // Sum final walking steps
                    for (let i = steps.length - 1; i > lastTransitIndex; i--) {
                        finalWalkingDuration += steps[i].duration
                    }

                    let durationWithoutFinalWalking = directions.durationSeconds - finalWalkingDuration

                    const departureTime = new Date(lastTransitTime.getTime() - durationWithoutFinalWalking * 1000)

                    const formattedTime = formatISOToTime(departureTime.toISOString())
                    setArriveLeaveDetails(`Depart at ${formattedTime}`)
                }
            } else if (selectedMode === 'Walk' || selectedMode === 'Drive' || selectedMode === 'Bike') {
                // For walk/drive/bike modes, use total duration
                const baseTime = new Date(timeFilter);
                const durationMs = directions.durationSeconds * 1000;

                if (timeFilterMode === 'depart') {
                    const arrivalTime = new Date(baseTime.getTime() + durationMs);
                    setArriveLeaveDetails(`Arrive by ${formatISOToTime(arrivalTime.toISOString())}`);
                } else {
                    const departureTime = new Date(baseTime.getTime() - durationMs);
                    setArriveLeaveDetails(`Depart at ${formatISOToTime(departureTime.toISOString())}`);
                }
            } else {
                setArriveLeaveDetails('');
            }
        } catch (err) {
            console.warn('Failed to calculate arrival/departure time', err);
            setArriveLeaveDetails('');
        }
    }, [directions, timeFilter, timeFilterMode, selectedMode]);

    const handleModeChange = (mode: TransportModeLabel) => {
        setSelectedMode(mode);
        onModeChange?.(mode);
    };

    const handleTimeFilterChange = (time: string, mode: TimeFilterMode) => {
        setTimeFilter(time);
        setTimeFilterMode(mode);
        setTimePickerVisible(false);
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

    const displayDepartureTime = formatISOToTime(timeFilter);
    const timeModeLabel = timeFilterMode === 'depart' ? 'Depart at' : 'Arrive by';

    return (
        <>
            <View style={styles.navCard}>
                <View style={styles.navHeaderRow}>
                    <Text style={styles.navHeaderText}>{selectedMode}</Text>
                    <Pressable
                        style={styles.departAtButton}
                        onPress={() => setTimePickerVisible(true)}
                    >
                        <Text style={styles.departAtButtonText}>{timeModeLabel}: {displayDepartureTime}</Text>
                    </Pressable>
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
                            {arriveLeaveDetails}
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

            <TimePickerModal
                visible={timePickerVisible}
                initialTime={timeFilter}
                initialMode={timeFilterMode}
                onConfirm={handleTimeFilterChange}
                onCancel={() => setTimePickerVisible(false)}
            />
        </>
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
    departAtButton: {
        backgroundColor: '#F5F3FF',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    departAtButtonText: {color: '#111827', fontWeight: '600', fontSize: 12},
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
