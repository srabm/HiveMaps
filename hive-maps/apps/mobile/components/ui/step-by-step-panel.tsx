import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager,
    Animated,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Step } from '@/services/maps/directions-api-adapter';
import type { ShuttlePhase } from '@/hooks/use-step-navigator';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Maneuver → MaterialIcon mapping ───────────────────────────────────────
// Keys are the canonical maneuver strings produced by buildMapboxManeuver()
// (directions-api-adapter.ts) for Mapbox, and the UPPER_SNAKE_CASE values
// from Google Maps navigationInstruction.maneuver.
//
// All icon names are verified present in the MaterialIcons glyph map
// (@expo/vector-icons 15.1.1).
const MANEUVER_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
    // ── Mapbox combined type-modifier strings ──────────────────────────────
    // Turns (type="turn" + modifier)
    'turn-left':        'turn-left',
    'turn-right':       'turn-right',
    'turn-slight-left': 'turn-slight-left',
    'turn-slight-right':'turn-slight-right',
    'turn-sharp-left':  'turn-sharp-left',
    'turn-sharp-right': 'turn-sharp-right',
    'turn-uturn':       'u-turn-left',   // uturn — default to left (most common)
    // Straight / continue
    'continue':         'straight',
    'new-name':         'straight',
    'new name':         'straight',      // keep original spacing as fallback
    // Depart / arrive
    'depart':           'my-location',
    'arrive':           'flag',
    // Merge
    'merge':            'merge',
    // Ramps
    'on ramp':          'ramp-right',
    'on-ramp':          'ramp-right',
    'off ramp':         'ramp-left',
    'off-ramp':         'ramp-left',
    // Fork
    'fork':             'fork-right',
    'fork-left':        'fork-left',
    'fork-right':       'fork-right',
    // End of road / U-turns
    'end of road':      'u-turn-right',
    'end-of-road':      'u-turn-right',
    'u-turn-left':      'u-turn-left',
    'u-turn-right':     'u-turn-right',
    // Lane guidance
    'use lane':         'straight',
    'use-lane':         'straight',
    // Roundabouts
    'roundabout':       'roundabout-left',
    'rotary':           'roundabout-left',
    'roundabout turn':  'roundabout-left',
    'roundabout-turn':  'roundabout-left',
    'roundabout-left':  'roundabout-left',
    'roundabout-right': 'roundabout-right',
    'exit-roundabout':  'roundabout-left',
    'exit-rotary':      'roundabout-left',
    // Misc
    'notification':     'info-outline',

    // ── Google Maps UPPER_SNAKE_CASE maneuver values ───────────────────────
    TURN_RIGHT:         'turn-right',
    TURN_LEFT:          'turn-left',
    TURN_SLIGHT_RIGHT:  'turn-slight-right',
    TURN_SLIGHT_LEFT:   'turn-slight-left',
    TURN_SHARP_RIGHT:   'turn-sharp-right',
    TURN_SHARP_LEFT:    'turn-sharp-left',
    STRAIGHT:           'straight',
    UTURN_LEFT:         'u-turn-left',
    UTURN_RIGHT:        'u-turn-right',
    RAMP_LEFT:          'ramp-left',
    RAMP_RIGHT:         'ramp-right',
    MERGE:              'merge',
    FORK_LEFT:          'fork-left',
    FORK_RIGHT:         'fork-right',
    FERRY:              'directions-boat',
    FERRY_TRAIN:        'train',
    ROUNDABOUT_LEFT:    'roundabout-left',
    ROUNDABOUT_RIGHT:   'roundabout-right',
};

function getManeuverIcon(maneuver: string): React.ComponentProps<typeof MaterialIcons>['name'] {
    const icon = MANEUVER_ICON[maneuver] ?? MANEUVER_ICON[maneuver?.toUpperCase()];
    if (!icon) {
        console.warn(`[StepByStepPanel] Unknown maneuver: "${maneuver}" — falling back to straight`);
    }
    return icon ?? 'straight';
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function formatDist(metres: number | null | undefined): string {
    if (metres == null) return '';
    if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
    if (metres >= 100) return `${Math.round(metres / 10) * 10} m`;
    return `${Math.round(metres)} m`;
}

function formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}` : `${h}h`;
}

function formatDurationUnit(seconds: number): string {
    return Math.round(seconds / 60) < 60 ? 'min' : '';
}

function formatArrivalTime(durationSeconds: number): string {
    const arrival = new Date(Date.now() + durationSeconds * 1000);
    return arrival.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ─── Shuttle phase label helper ───────────────────────────────────────────────
const SHUTTLE_PHASE_LABEL: Record<ShuttlePhase, { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string; color: string }> = {
    'walk-to-stop':   { icon: 'directions-walk', text: 'Walk to shuttle stop', color: '#1d4ed8' },
    'shuttle':        { icon: 'directions-bus',  text: 'On shuttle',           color: '#9d1e30' },
    'walk-from-stop': { icon: 'directions-walk', text: 'Walk to destination',  color: '#059669' },
};

// ─── Transit boarding card ───────────────────────────────────────────────────
function TransitCard({ step }: { step: Step }) {
    const td = step.transitDetails;
    if (!td) return null;

    const lineName = td.transitLine?.nameShort ?? td.transitLine?.name ?? null;
    const lineColor: string = td.transitLine?.color ?? '#374151';
    const departureStop = td.stopDetails?.departureStop?.name ?? null;
    const arrivalStop = td.stopDetails?.arrivalStop?.name ?? null;

    // Format time strings like "2025-01-15T14:30:00-05:00" → "2:30 PM"
    const fmtTime = (raw: string | undefined): string | null => {
        if (!raw) return null;
        try {
            return new Date(raw).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        } catch {
            return null;
        }
    };

    const depTime = fmtTime(td.stopDetails?.departureTime?.time ?? td.departureTime);
    const arrTime = fmtTime(td.stopDetails?.arrivalTime?.time ?? td.arrivalTime);

    return (
        <View style={[transitCardStyles.card, { borderLeftColor: lineColor }]}>
            {/* Line badge */}
            <View style={[transitCardStyles.lineBadge, { backgroundColor: lineColor }]}>
                <MaterialIcons name="directions-bus" size={12} color="#fff" />
                {lineName ? <Text style={transitCardStyles.lineBadgeText}>{lineName}</Text> : null}
            </View>

            {/* Stop info */}
            <View style={transitCardStyles.stopRow}>
                {departureStop ? (
                    <View style={transitCardStyles.stopItem}>
                        <MaterialIcons name="radio-button-on" size={14} color="#059669" />
                        <View style={transitCardStyles.stopTextBlock}>
                            <Text style={transitCardStyles.stopLabel}>Board at</Text>
                            <Text style={transitCardStyles.stopName} numberOfLines={1}>{departureStop}</Text>
                            {depTime ? <Text style={transitCardStyles.stopTime}>{depTime}</Text> : null}
                        </View>
                    </View>
                ) : null}

                {arrivalStop ? (
                    <View style={transitCardStyles.stopItem}>
                        <MaterialIcons name="radio-button-off" size={14} color="#9d1e30" />
                        <View style={transitCardStyles.stopTextBlock}>
                            <Text style={transitCardStyles.stopLabel}>Exit at</Text>
                            <Text style={transitCardStyles.stopName} numberOfLines={1}>{arrivalStop}</Text>
                            {arrTime ? <Text style={transitCardStyles.stopTime}>{arrTime}</Text> : null}
                        </View>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const transitCardStyles = StyleSheet.create({
    card: {
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 10,
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#0ea5e9',
        gap: 10,
    },
    lineBadge: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
        alignItems: 'center',
    },
    lineBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    stopRow: {
        flexDirection: 'row',
        gap: 16,
    },
    stopItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    stopTextBlock: {
        flex: 1,
    },
    stopLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    stopName: {
        fontSize: 12,
        color: '#111827',
        fontWeight: '600',
    },
    stopTime: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },
});

// ─── Props ───────────────────────────────────────────────────────────────────
type StepByStepPanelProps = {
    /** All steps for the current route (all modes). */
    steps: Step[];
    currentStep: Step | null;
    nextStep: Step | null;
    afterNextStep: Step | null;
    currentStepIndex: number;
    distanceToNextTurn: number | null;
    totalDistanceRemaining: number | null;
    /**
     * Estimated seconds remaining, derived live from remaining distance and
     * step durations. Used for the bottom bar; updates on every GPS tick.
     */
    totalDurationSecondsRemaining: number | null;
    arrived: boolean;
    /** When true, shows a persistent "Recalculating…" banner above the instruction. */
    isRecalculating: boolean;
    /** Current shuttle phase label — null for non-shuttle modes. */
    shuttlePhase: ShuttlePhase | null;
    onExit: () => void;
};

// ─── Full directions list row ────────────────────────────────────────────────
function StepRow({
    step,
    index,
    isCurrent,
}: {
    step: Step;
    index: number;
    isCurrent: boolean;
}) {
    return (
        <View style={[stepRowStyles.row, isCurrent && stepRowStyles.rowActive]}>
            <View style={[stepRowStyles.iconWrap, isCurrent && stepRowStyles.iconWrapActive]}>
                <MaterialIcons
                    name={getManeuverIcon(step.maneuver)}
                    size={18}
                    color={isCurrent ? '#ffffff' : '#6B7280'}
                />
            </View>
            <View style={stepRowStyles.textWrap}>
                <Text style={[stepRowStyles.instruction, isCurrent && stepRowStyles.instructionActive]} numberOfLines={2}>
                    {step.instruction || 'Continue'}
                </Text>
                {step.distance > 0 && (
                    <Text style={stepRowStyles.dist}>{formatDist(step.distance)}</Text>
                )}
            </View>
        </View>
    );
}

const stepRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    rowActive: {
        backgroundColor: '#FFF8E1',
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    iconWrapActive: {
        backgroundColor: '#9d1e30',
    },
    textWrap: { flex: 1 },
    instruction: { fontSize: 14, color: '#111827', fontWeight: '500' },
    instructionActive: { fontWeight: '700', color: '#9d1e30' },
    dist: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

// ─── Recalculating banner ────────────────────────────────────────────────────
// Rendered as a persistent strip above the instruction panel (not replacing it)
// so the user can still see where they're going while rerouting.
function RecalculatingBanner() {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    return (
        <View style={recalcStyles.banner}>
            <Animated.View style={{ opacity: pulseAnim }}>
                <MaterialIcons name="sync" size={16} color="#fff" />
            </Animated.View>
            <Text style={recalcStyles.text}>Recalculating route…</Text>
        </View>
    );
}

const recalcStyles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#9d1e30',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
});


// ─── Main panel ─────────────────────────────────────────────────────────────
export function StepByStepPanel({
    steps,
    currentStep,
    nextStep,
    afterNextStep,
    currentStepIndex,
    distanceToNextTurn,
    totalDistanceRemaining,
    totalDurationSecondsRemaining,
    arrived,
    isRecalculating,
    shuttlePhase,
    onExit,
}: Readonly<StepByStepPanelProps>) {
    const [showAllSteps, setShowAllSteps] = useState(false);

    const toggleAllSteps = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowAllSteps((v) => !v);
    }, []);

    // ── Live clock tick for arrival time ─────────────────────────────────
    // We re-render the bottom bar every 10 s so the arrival time clock stays
    // accurate even when the user is stationary (totalDurationSecondsRemaining
    // doesn't change, but wall-clock time advances).
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 10_000);
        return () => clearInterval(id);
    }, []);

    // The seconds value used for the bottom bar. We prefer the live estimate
    // from the hook; fall back to zero if not yet available.
    const durationSecs = totalDurationSecondsRemaining ?? 0;

    // ── Arrived state ────────────────────────────────────────────────────────
    if (arrived) {
        return (
            <View style={styles.container} pointerEvents="box-none">
                <View style={styles.topPanel}>
                    <View style={styles.mainRow}>
                        {/* Red flag matches the app's brand colour */}
                        <View style={[styles.mainIconWrap, styles.mainIconWrapArrived]}>
                            <MaterialIcons name="flag" size={28} color="#ffffff" />
                        </View>
                        <View style={styles.instructionBlock}>
                            <Text style={styles.instructionText}>You have arrived!</Text>
                        </View>
                    </View>
                </View>
                {/* Centred End button */}
                <View style={styles.bottomBarArrived}>
                    <Pressable style={styles.endButton} onPress={onExit}>
                        <Text style={styles.endButtonText}>End Navigation</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!currentStep) return null;

    const distLabel = distanceToNextTurn != null ? formatDist(distanceToNextTurn) : '';

    // ── The top card always shows the CURRENT step — the action the user is
    // performing right now, with the distance remaining until its endpoint.
    // The "Then:" preview row beneath the divider shows the NEXT step.
    // The expanded list highlights currentStepIndex — all three are in sync.

    // ── Transit card: show when the current step has transit details ──────
    const showTransitCard = !!currentStep.transitDetails;

    // ── Shuttle phase banner ──────────────────────────────────────────────
    const shuttlePhaseMeta = shuttlePhase ? SHUTTLE_PHASE_LABEL[shuttlePhase] : null;

    return (
        <View style={styles.container} pointerEvents="box-none">

            {/* ── Top instruction panel ── */}
            <View style={styles.topPanel}>

                {/* Recalculating banner — sits at the top of the card, always visible */}
                {isRecalculating && <RecalculatingBanner />}

                {/* Shuttle phase context strip */}
                {shuttlePhaseMeta && (
                    <View style={[styles.phaseStrip, { backgroundColor: shuttlePhaseMeta.color + '18' }]}>
                        <MaterialIcons name={shuttlePhaseMeta.icon} size={13} color={shuttlePhaseMeta.color} />
                        <Text style={[styles.phaseText, { color: shuttlePhaseMeta.color }]}>
                            {shuttlePhaseMeta.text}
                        </Text>
                    </View>
                )}

                {/* ── Current step instruction ── */}
                {/* Transit steps (including shuttle) show TransitCard instead of a maneuver icon */}
                {shuttlePhase !== 'shuttle' && (
                    <View style={styles.mainRow}>
                        <View style={[styles.mainIconWrap, styles.mainIconWrapActive]}>
                            <MaterialIcons
                                name={getManeuverIcon(currentStep.maneuver)}
                                size={28}
                                color="#ffffff"
                            />
                        </View>
                        <View style={styles.instructionBlock}>
                            <Text style={styles.instructionText} numberOfLines={2}>
                                {currentStep.instruction || 'Continue'}
                            </Text>
                            {distLabel ? (
                                <Text style={styles.distLabel}>{distLabel}</Text>
                            ) : null}
                        </View>
                    </View>
                )}

                {/* Transit boarding card — renders for real transit steps AND injected shuttle steps */}
                {showTransitCard && shuttlePhase === 'shuttle' && (
                    <Text style={styles.shuttleRideLabel}>Ride the Concordia Shuttle</Text>
                )}
                {showTransitCard && <TransitCard step={currentStep} />}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Next step preview */}
                <Pressable style={styles.nextRow} onPress={toggleAllSteps} hitSlop={8}>
                    <View style={styles.nextIconWrap}>
                        <MaterialIcons
                            name={nextStep ? getManeuverIcon(nextStep.maneuver) : 'flag'}
                            size={16}
                            color="#ffffff"
                        />
                    </View>
                    <Text style={styles.nextText} numberOfLines={1}>
                        {nextStep
                            ? `Then: ${nextStep.instruction || 'Continue'}`
                            : 'Arriving at destination'}
                    </Text>
                    <MaterialIcons
                        name={showAllSteps ? 'expand-less' : 'expand-more'}
                        size={20}
                        color="#9d1e30"
                    />
                </Pressable>

                {/* Expandable full directions list — shared by both branches */}
                {showAllSteps && (
                    <ScrollView
                        style={styles.stepsScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                    >
                        {steps.map((step, idx) => (
                            <StepRow
                                key={`step-${idx}`}
                                step={step}
                                index={idx}
                                isCurrent={idx === currentStepIndex}
                            />
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* ── Bottom status bar ── */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomStat}>
                    {/* Arrival time — adjustsFontSizeToFit prevents wrapping on wide locales */}
                    <Text style={styles.bottomStatValue} numberOfLines={1} adjustsFontSizeToFit>
                        {formatArrivalTime(durationSecs)}
                    </Text>
                    <Text style={styles.bottomStatLabel}>arrival</Text>
                </View>

                <View style={styles.bottomDivider} />

                <View style={styles.bottomStat}>
                    {/* Duration remaining — live from hook estimate */}
                    <Text style={styles.bottomStatValue} numberOfLines={1} adjustsFontSizeToFit>
                        {formatDuration(durationSecs)}
                    </Text>
                    <Text style={styles.bottomStatLabel}>
                        {formatDurationUnit(durationSecs) || 'remaining'}
                    </Text>
                </View>

                <View style={styles.bottomDivider} />

                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>
                        {formatDist(totalDistanceRemaining)}
                    </Text>
                    <Text style={styles.bottomStatLabel}>remain</Text>
                </View>

                <Pressable style={styles.endButton} onPress={onExit}>
                    <Text style={styles.endButtonText}>End</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'space-between',
        pointerEvents: 'box-none',
    },

    // ── Top panel
    topPanel: {
        marginHorizontal: 12,
        marginTop: 48,         // safe-area clearance
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },

    // Shuttle phase context strip
    phaseStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 7,
    },
    phaseText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    mainIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Active navigation: red filled circle with white icon
    mainIconWrapActive: {
        backgroundColor: '#9d1e30',
    },
    // Arrived state: same red circle, reused
    mainIconWrapArrived: {
        backgroundColor: '#9d1e30',
    },
    instructionBlock: { flex: 1 },
    shuttleRideLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    instructionText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 24,
    },
    distLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
        fontWeight: '500',
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
    },

    nextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 10,
    },
    nextIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#9d1e30',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },

    stepsScroll: {
        maxHeight: 280,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
    },

    // ── Bottom bar (normal navigation)
    bottomBar: {
        marginHorizontal: 12,
        marginBottom: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },

    // ── Bottom bar (arrived state) — centred End button
    bottomBarArrived: {
        marginHorizontal: 12,
        marginBottom: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 8,
    },

    bottomStat: {
        flex: 1,
        minWidth: 0,        // allows flex children to shrink below their natural size
        alignItems: 'center',
    },
    bottomStatValue: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    bottomStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    bottomDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#E5E7EB',
    },
    endButton: {
        backgroundColor: '#9d1e30',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    endButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});