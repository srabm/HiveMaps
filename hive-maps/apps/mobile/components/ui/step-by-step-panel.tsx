import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Step } from '@/services/maps/directions-api-adapter';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Maneuver → MaterialIcon mapping ───────────────────────────────────────
// Covers Mapbox (lowercase) and Google Maps (UPPER_SNAKE_CASE) maneuver values.
const MANEUVER_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
    // Mapbox
    turn: 'turn-right',
    'turn-right': 'turn-right',
    'turn-left': 'turn-left',
    'turn-slight-right': 'turn-slight-right',
    'turn-slight-left': 'turn-slight-left',
    'turn-sharp-right': 'turn-sharp-right',
    'turn-sharp-left': 'turn-sharp-left',
    continue: 'straight',
    'new name': 'straight',
    depart: 'my-location',
    arrive: 'flag',
    merge: 'merge',
    'on ramp': 'ramp-right',
    'off ramp': 'ramp-left',
    fork: 'call-split',
    'end of road': 'u-turn-right',
    'use lane': 'straight',
    rotary: 'roundabout-left',
    roundabout: 'roundabout-left',
    'roundabout turn': 'roundabout-left',
    notification: 'info-outline',
    // Google Maps
    TURN_RIGHT: 'turn-right',
    TURN_LEFT: 'turn-left',
    TURN_SLIGHT_RIGHT: 'turn-slight-right',
    TURN_SLIGHT_LEFT: 'turn-slight-left',
    TURN_SHARP_RIGHT: 'turn-sharp-right',
    TURN_SHARP_LEFT: 'turn-sharp-left',
    STRAIGHT: 'straight',
    UTURN_LEFT: 'u-turn-left',
    UTURN_RIGHT: 'u-turn-right',
    RAMP_LEFT: 'ramp-left',
    RAMP_RIGHT: 'ramp-right',
    MERGE: 'merge',
    FORK_LEFT: 'call-split',
    FORK_RIGHT: 'call-split',
    FERRY: 'directions-boat',
    FERRY_TRAIN: 'train',
    ROUNDABOUT_LEFT: 'roundabout-left',
    ROUNDABOUT_RIGHT: 'roundabout-right',
};

function getManeuverIcon(maneuver: string): React.ComponentProps<typeof MaterialIcons>['name'] {
    return MANEUVER_ICON[maneuver] ?? MANEUVER_ICON[maneuver?.toUpperCase()] ?? 'straight';
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
    /** Total route duration in seconds (for bottom bar). */
    totalDurationSeconds: number;
    arrived: boolean;
    /** When true, shows a "Recalculating…" banner in place of the current instruction. */
    isRecalculating: boolean;
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

// ─── Main panel ─────────────────────────────────────────────────────────────
export function StepByStepPanel({
    steps,
    currentStep,
    nextStep,
    afterNextStep,
    currentStepIndex,
    distanceToNextTurn,
    totalDistanceRemaining,
    totalDurationSeconds,
    arrived,
    isRecalculating,
    onExit,
}: Readonly<StepByStepPanelProps>) {
    const [showAllSteps, setShowAllSteps] = useState(false);

    const toggleAllSteps = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowAllSteps((v) => !v);
    }, []);

    // ── Arrived state ────────────────────────────────────────────────────────
    if (arrived) {
        return (
            <View style={styles.container} pointerEvents="box-none">
                <View style={styles.topPanel}>
                    <View style={styles.mainRow}>
                        <View style={styles.mainIconWrap}>
                            <MaterialIcons name="flag" size={28} color="#10B981" />
                        </View>
                        <View style={styles.instructionBlock}>
                            <Text style={styles.instructionText}>You have arrived!</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.bottomBar}>
                    <Pressable style={styles.endButton} onPress={onExit}>
                        <Text style={styles.endButtonText}>End</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!currentStep) return null;

    const iconName = getManeuverIcon(currentStep.maneuver);
    const distLabel = distanceToNextTurn != null ? formatDist(distanceToNextTurn) : '';

    return (
        <View style={styles.container} pointerEvents="box-none">

            {/* ── Top instruction panel ── */}
            <View style={styles.topPanel}>

                {/* Current step row — replaced by recalculating banner when off-route */}
                {isRecalculating ? (
                    <View style={styles.recalcRow}>
                        <ActivityIndicator size="small" color="#9d1e30" />
                        <Text style={styles.recalcText}>Recalculating…</Text>
                    </View>
                ) : (
                    <View style={styles.mainRow}>
                        <View style={styles.mainIconWrap}>
                            <MaterialIcons
                                name={nextStep ? getManeuverIcon(nextStep.maneuver) : getManeuverIcon(currentStep.maneuver)}
                                size={28}
                                color="#111827"
                            />
                        </View>
                        <View style={styles.instructionBlock}>
                            <Text style={styles.instructionText} numberOfLines={2}>
                                {(nextStep ?? currentStep).instruction || 'Continue'}
                            </Text>
                            {distLabel ? (
                                <Text style={styles.distLabel}>{distLabel}</Text>
                            ) : null}
                        </View>
                    </View>
                )}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Next step preview — tap to expand full list */}
                <Pressable style={styles.nextRow} onPress={toggleAllSteps} hitSlop={8}>
                    <View style={styles.nextIconWrap}>
                        <MaterialIcons
                            name={afterNextStep ? getManeuverIcon(afterNextStep.maneuver) : 'flag'}
                            size={16}
                            color="#ffffff"
                        />
                    </View>
                    <Text style={styles.nextText} numberOfLines={1}>
                        {afterNextStep
                            ? `Then: ${afterNextStep.instruction || 'Continue'}`
                            : nextStep ? 'Arriving at destination' : 'You have arrived'}
                    </Text>
                    <MaterialIcons
                        name={showAllSteps ? 'expand-less' : 'expand-more'}
                        size={20}
                        color="#9d1e30"
                    />
                </Pressable>

                {/* Expandable full directions list */}
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
                    <Text style={styles.bottomStatValue}>
                        {formatArrivalTime(totalDurationSeconds)}
                    </Text>
                    <Text style={styles.bottomStatLabel}>arrival</Text>
                </View>

                <View style={styles.bottomDivider} />

                <View style={styles.bottomStat}>
                    <Text style={styles.bottomStatValue}>
                        {formatDuration(totalDurationSeconds)}
                    </Text>
                    <Text style={styles.bottomStatLabel}>
                        {formatDurationUnit(totalDurationSeconds) || 'remaining'}
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
    instructionBlock: { flex: 1 },
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

    arrivedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },

    // ── Bottom bar
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
    bottomStat: {
        flex: 1,
        alignItems: 'center',
    },
    bottomStatValue: {
        fontSize: 18,
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

    // Recalculating banner
    recalcRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        minHeight: 84,
    },
    recalcText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#9d1e30',
    },
});