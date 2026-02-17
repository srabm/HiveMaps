import React, {useState, useRef, useEffect, useMemo} from 'react';
import {View, Text, Pressable, StyleSheet, Animated} from 'react-native';
import {
    getDirections,
    TransportMode,
    DirectionsResponse,
    DirectionsRequest,
    Coordinate,
    Provider
} from '@/services/maps/directions-api-adapter';
import {useShuttleSchedule} from '@/hooks/use-shuttle-schedule';
import {useShuttleRouting} from '@/hooks/use-shuttle-routing';
import {ShuttleScheduleModal} from '@/components/ui/shuttle-schedule-modal';
import {ShuttleScheduleSection} from '@/components/ui/shuttle-schedule-section';

type TransportModeLabel = 'Drive' | 'Walk' | 'Transit' | 'Shuttle';

interface NavigationBottomProps {
    origin: Coordinate;
    destination: Coordinate;
    onDirectionsChange?: (directions: DirectionsResponse) => void;
    onStartPress?: () => void;
    onModeChange?: (mode: TransportModeLabel) => void;
    initialMode?: TransportModeLabel;
    arrivalTime?: string;
}

const MODES: TransportModeLabel[] = ['Drive', 'Walk', 'Transit', 'Shuttle'];

const MODE_META: Record<TransportModeLabel, {label: string; indicatorColor: string}> = {
    Drive: {label: 'Drive', indicatorColor: '#e5a712'},
    Walk: {label: 'Walk', indicatorColor: '#e5a712'},
    Transit: {label: 'Transit', indicatorColor: '#e5a712'},
    Shuttle: {label: 'Shuttle', indicatorColor: '#f4b742'},
};

const mapUiModeToTransportMode = (mode: TransportModeLabel) => {
    switch (mode) {
        case 'Drive':
            return TransportMode.DRIVING;
        case 'Walk':
            return TransportMode.WALKING;
        case 'Transit':
            return TransportMode.TRANSIT;
        case 'Shuttle':
            return TransportMode.TRANSIT;
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

const formatDepartureTime = (date: Date) =>
    date.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});

const formatMinutesUntil = (minutes: number) => {
    if (minutes < 60) return `in ${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `in ${h} hr ${m} min` : `in ${h} hr`;
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
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
            let timeoutId: NodeJS.Timeout;

            const fetchDirections = async () => {
                setIsLoading(true);
                setDirections(null);
                setShowScheduleModal(false);

                if (selectedMode === 'Shuttle') {
                    setIsLoading(false);
                    return;
                }

                try {
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
                    if (!active) return;
                    setDirections(null);
                    console.warn('Failed to load directions', err);
                } finally {
                    if (active) setIsLoading(false);
                }
            };

            // 1. Throttling/Debouncing:
            // We wait 1000ms after the last location update before fetching.
            // This prevents hitting the API multiple times per second while the user is moving.
            timeoutId = setTimeout(() => {
                fetchDirections();
            }, 1000);

            return () => {
                active = false;
                clearTimeout(timeoutId);
            };
            // 2. Dependency Optimization:
            // Use primitive values (lat/lng) instead of the 'origin' and 'destination' objects.
            // This ensures the effect doesn't fire just because the parent re-rendered.
        }, [
            origin.longitude,
            origin.latitude,
            destination.longitude,
            destination.latitude,
            selectedMode,
            onDirectionsChange
        ]);

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

    const shuttleScheduleContext = useShuttleSchedule({
        enabled: selectedMode === 'Shuttle',
        origin,
        destination,
    });

    const shuttleRouting = useShuttleRouting({
        enabled: selectedMode === 'Shuttle',
        origin,
        destination,
    });

    // Compute composite shuttle metrics from the three route legs
    const shuttleMetrics = useMemo(() => {
        if (selectedMode !== 'Shuttle') return null;
        const {walkToStop, shuttleLeg, walkFromStop} = shuttleRouting;
        if (!walkToStop || !shuttleLeg || !walkFromStop) return null;

        const totalDurationSeconds =
            walkToStop.durationSeconds + shuttleLeg.durationSeconds + walkFromStop.durationSeconds;
        const totalDistanceMeters =
            walkToStop.distanceMeters + shuttleLeg.distanceMeters + walkFromStop.distanceMeters;

        // Only consider departures you can actually walk to in time
        const walkMinutes = Math.ceil(walkToStop.durationSeconds / 60);
        const reachableDepartures = shuttleScheduleContext?.departures?.filter(
            (d) => d.minutesUntil >= walkMinutes,
        );

        const nextDeparture = reachableDepartures?.[0];
        const arrivalDate = nextDeparture
            ? new Date(nextDeparture.departureDate.getTime() + (shuttleLeg.durationSeconds + walkFromStop.durationSeconds) * 1000)
            : null;
        const arrivalLabel = arrivalDate
            ? `Arrive by ${arrivalDate.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'})}`
            : arrivalTime;

        return {totalDurationSeconds, totalDistanceMeters, arrivalLabel, walkMinutes};
    }, [selectedMode, shuttleRouting, shuttleScheduleContext, arrivalTime]);

    // Departures filtered to only those reachable given the walk-to-stop time
    const reachableDepartures = useMemo(() => {
        if (!shuttleScheduleContext?.departures) return [];
        if (shuttleScheduleContext.isNextServiceDay || shuttleMetrics == null) {
            return shuttleScheduleContext.departures;
        }
        return shuttleScheduleContext.departures.filter(
            (item) => item.minutesUntil >= shuttleMetrics.walkMinutes,
        );
    }, [shuttleScheduleContext, shuttleMetrics]);

    const hideMetricsRow =
        selectedMode === 'Shuttle' &&
        ((!shuttleScheduleContext?.schedule ||
            !!shuttleScheduleContext?.showNextServiceLabel ||
            reachableDepartures.length === 0) ||
            !shuttleMetrics);

    const activeDurationSeconds =
        selectedMode === 'Shuttle' && shuttleMetrics
            ? shuttleMetrics.totalDurationSeconds
            : directions?.durationSeconds;
    const activeDistanceMeters =
        selectedMode === 'Shuttle' && shuttleMetrics
            ? shuttleMetrics.totalDistanceMeters
            : directions?.distanceMeters;
    const activeArrivalTime =
        selectedMode === 'Shuttle' && shuttleMetrics ? shuttleMetrics.arrivalLabel : arrivalTime;

    const durationText = formatDuration(activeDurationSeconds);
    const distanceText = formatDistance(activeDistanceMeters);
    const durationParts = useMemo(() => durationText.split(' '), [durationText]);
    const durationValue = durationParts[0] ?? durationText;
    const durationUnit = durationParts[1] ?? 'min';

    const formatTimeLabel = (time: string, baseDate: Date) => {
        const [hoursStr, minutesStr] = time.split(':');
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0, 0);
        return formatDepartureTime(date);
    };

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
                            backgroundColor: MODE_META[selectedMode].indicatorColor,
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
                            {MODE_META[mode].label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {!hideMetricsRow && (
                <View style={styles.metricsRow}>
                    <View style={[styles.metricCell, styles.durationCell]}>
                        <Text style={styles.durationValue}>{durationValue}</Text>
                        <Text style={styles.durationUnit}>{durationUnit}</Text>
                    </View>

                    <View style={[styles.metricCell, styles.middleCell]}>
                        <Text style={styles.arrivalText} numberOfLines={1} ellipsizeMode="tail">
                            {activeArrivalTime}
                        </Text>
                        <Text style={styles.distanceText}>{distanceText}</Text>
                    </View>

                    <View style={[styles.metricCell, styles.startCell]}>
                        <Pressable style={styles.startButton} onPress={onStartPress}>
                            <Text style={styles.startButtonText}>Start</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {selectedMode === 'Shuttle' && (
                <ShuttleScheduleSection
                    directionLabel={shuttleScheduleContext?.directionLabel ?? 'Shuttle'}
                    validPeriod={shuttleScheduleContext?.schedule?.validPeriod}
                    hasSchedule={!!shuttleScheduleContext?.schedule}
                    showNextServiceLabel={!!shuttleScheduleContext?.showNextServiceLabel}
                    nextServiceLabel={
                        shuttleScheduleContext?.showNextServiceLabel
                            ? shuttleScheduleContext?.serviceDate.toLocaleDateString(undefined, {weekday: 'long'})
                            : undefined
                    }
                    departures={
                        reachableDepartures.slice(0, 3).map((item) => ({
                            key: `${shuttleScheduleContext?.directionLabel}-${item.time}`,
                            timeLabel: formatDepartureTime(item.departureDate),
                            etaLabel: shuttleScheduleContext?.isNextServiceDay
                                ? `on ${shuttleScheduleContext.serviceDate.toLocaleDateString(undefined, {weekday: 'long'})}`
                                : formatMinutesUntil(item.minutesUntil),
                        }))
                    }
                    showSeeMoreButton={
                        !!shuttleScheduleContext?.showSeeMoreButton ||
                        reachableDepartures.length > 3
                    }
                    onOpenModal={() => setShowScheduleModal(true)}
                    onFallbackPress={() => handleModeChange('Transit')}
                    noTopSpacing={hideMetricsRow}
                    inlineMetrics={
                        hideMetricsRow && shuttleMetrics
                            ? {
                                  durationText: formatDuration(shuttleMetrics.totalDurationSeconds),
                                  distanceText: formatDistance(shuttleMetrics.totalDistanceMeters),
                                  arrivalLabel: shuttleMetrics.arrivalLabel,
                              }
                            : null
                    }
                />
            )}

            <ShuttleScheduleModal
                visible={showScheduleModal}
                directionLabel={shuttleScheduleContext?.directionLabel ?? 'Shuttle'}
                serviceDateLabel={
                    shuttleScheduleContext?.schedule
                        ? shuttleScheduleContext.serviceDate.toLocaleDateString(undefined, {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                          })
                        : undefined
                }
                times={
                    shuttleScheduleContext?.departureTimes?.map((time) =>
                        formatTimeLabel(time, shuttleScheduleContext.serviceDate),
                    ) ?? []
                }
                onClose={() => setShowScheduleModal(false)}
            />
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