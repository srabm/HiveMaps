import { IndoorDirectionsResponse, IndoorNodeResponse } from "@/services/http/indoor-api";
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions, Image, PanResponder, DimensionValue,} from "react-native";
// the indoor direction modal to show step-by-step direction
const AMBER       = "#E5A712";
const AMBER_LIGHT = "#FDF3E0";
const BG          = "#FFFFFF";
const DARK        = "#1A1A1A";
const MUTED       = "#AAAAAA";
const BORDER      = "#EFEFEF";

const { height: SCREEN_H } = Dimensions.get("window");
const MIN_HEIGHT   = SCREEN_H * 0.3;
const DEFAULT_HEIGHT = SCREEN_H * 0.5;
const MAX_HEIGHT   = SCREEN_H * 0.85;
const FIXED_H      = 195;


const DIRECTION_IMAGES: Record<string, any> = {
    STRAIGHT:  require("@/./assets/images/straight.png"),
    LEFT:      require("@/./assets/images/turn-left.png"),
    RIGHT:     require("@/./assets/images/turn-right.png"),
    DEFAULT:   require("@/./assets/images/bee.png"),
};

function getDirectionImage(direction: string): any {
    return DIRECTION_IMAGES[direction.toUpperCase()] ?? DIRECTION_IMAGES.DEFAULT;
}

function formatArrivalTime(durationMinutes: number): string {
    const arrival = new Date(Date.now() + durationMinutes * 60 * 1000);
    return arrival.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export interface DirectionsModalProps {
    visible: boolean;
    steps: IndoorDirectionsResponse[];
    origin?: string;
    destination?: string;
    onClose: () => void;
    onCurrentNodeChange?: (node: IndoorNodeResponse) => void;
    beeImageSource?: any;
}

function getFirstNode(step: IndoorDirectionsResponse): IndoorNodeResponse | null {
    if (!step.nodes || step.nodes.length === 0) return null;
    return step.nodes[0];
}

const DirectionsModal: React.FC<DirectionsModalProps> = ({
    visible,
    steps,
    origin = "Your location",
    destination,
    onClose,
    onCurrentNodeChange,
}) => {
    if (steps.length > 0) {
        steps = [
            ...steps,
            {
                direction: "DEFAULT",
                distance: 0,
                description: "You have arrived at your destination",
                nodes: [steps.at(-1)!.nodes[steps.at(-1)!.nodes.length - 1]],
            },
        ];
    }

    const [currentIndex, setCurrentIndex] = useState(0);
    const [sheetHeight, setSheetHeight]   = useState(DEFAULT_HEIGHT);

    const fadeAnim      = useRef(new Animated.Value(1)).current;
    const sheetAnim     = useRef(new Animated.Value(DEFAULT_HEIGHT)).current;
    const dragStartY    = useRef(0);
    const dragStartH    = useRef(DEFAULT_HEIGHT);
    const scrollRef     = useRef<ScrollView>(null);
    const isScrolling   = useRef(false);

    const remainingSteps = steps.slice(currentIndex);
    const isFirst        = currentIndex === 0;
    const isLast         = currentIndex >= steps.length - 1;
    const totalSteps     = steps.length;
    const progressPct    = (totalSteps > 1 ? `${Math.round((currentIndex / (totalSteps - 1)) * 100)}%` : "100%") as DimensionValue;
    const listH          = sheetHeight - FIXED_H;
    const destLabel      = destination ?? (() => { const l = steps[steps.length - 1]; return l?.nodes?.[l.nodes.length - 1]?.id ?? "Destination"; })();
    const [hasStarted, setHasStarted] = useState<boolean>(false);

    const [showAllSteps, setShowAllSteps] = useState(false);
    const currentStep = steps[currentIndex] ?? null;
    const nextStep = steps[currentIndex + 1] ?? null;
    const remainingDistance = Math.round(steps.slice(currentIndex).reduce((sum, step) => sum + (step.distance ?? 0), 0));
    const remainingMinutes = Math.max(1, Math.ceil((remainingDistance / 4000) * 60));

    useEffect(() => {
        if (!visible) return;
        if (!steps[currentIndex]) return;  // ← add this line
        const node = getFirstNode(steps[currentIndex]);
        if (node && onCurrentNodeChange) {
            onCurrentNodeChange(node);
        }
    }, [currentIndex, onCurrentNodeChange, steps, visible]);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setSheetHeight(DEFAULT_HEIGHT);
            setShowAllSteps(false);
            fadeAnim.setValue(1);
            Animated.timing(sheetAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        } else {
            Animated.timing(sheetAnim, { toValue: DEFAULT_HEIGHT, duration: 220, useNativeDriver: true }).start();
        }
    }, [fadeAnim, sheetAnim, visible]);

    // Scroll to top on step change
    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [currentIndex, showAllSteps]);

    useEffect(() => {
        if (!visible) {
            setHasStarted(false);
            setShowAllSteps(false);
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                dragStartH.current = sheetHeight;
            },
            onPanResponderMove: (_, gs) => {
                const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current - gs.dy));
                setSheetHeight(newH);
            },
        }),
    ).current;

    // ── Step transitions ──────────────────────────────────────────────────────
    const animateTransition = (callback: () => void) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            callback();
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        });
    };

    const goForward = () => {
        if (isLast) return;
        animateTransition(() => {
            setShowAllSteps(false);
            setCurrentIndex((prev) => prev + 1);
        });
    };

    const goBack = () => {
        if (isFirst) return;
        animateTransition(() => {
            setCurrentIndex(prev => prev - 1);
            setShowAllSteps(false);
        });
    };

    return (
        <View style={[styles.overlay, hasStarted && styles.overlayTop]} pointerEvents="box-none">
            <Animated.View
                style={[
                    styles.sheet,
                    hasStarted ? styles.topSheet : styles.bottomSheet,
                    { height: hasStarted ? undefined : sheetHeight, transform: [{ translateY: sheetAnim }] },
                ]}
            >
                {!hasStarted ? (
                    <View testID="drag-handle" style={styles.handleArea} {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>
                ) : null}

                {hasStarted ? (
                    <View>
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.headerDest} numberOfLines={1}>{destLabel}</Text>
                                <Text style={styles.progressLabel}>Step {Math.min(currentIndex + 1, totalSteps)} of {totalSteps}</Text>
                            </View>
                        </View>

                        <View style={styles.navRow}>
                            <TouchableOpacity
                                style={[styles.navBtnBack, isFirst && styles.navBtnDisabled]}
                                onPress={goBack}
                                activeOpacity={isFirst ? 1 : 0.82}
                                disabled={isFirst}
                            >
                                <Text style={[styles.navBtnTextBack, isFirst && styles.navBtnTextDisabled]}>Back</Text>
                            </TouchableOpacity>

                            {isLast ? (
                                <View style={[styles.navBtnNext, styles.navBtnArrived]}>
                                    <Text style={styles.navBtnTextNext}>Arrived</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.navBtnNext} onPress={goForward} activeOpacity={0.82}>
                                    <Text style={styles.navBtnTextNext}>Next</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {currentStep ? (
                            <Animated.View style={[styles.stepRow, styles.currentStepRow, { opacity: fadeAnim }]}>
                                <View style={styles.iconWrap}>
                                    <Image
                                        source={getDirectionImage(currentStep.direction)}
                                        style={styles.directionImage}
                                        resizeMode="contain"
                                    />
                                </View>
                                <View style={styles.stepTextWrap}>
                                    <Text style={styles.stepTitle}>{currentStep.description}</Text>
                                    {currentStep.distance > 0 ? <Text style={styles.stepSub}>{currentStep.distance.toFixed(1)} m</Text> : null}
                                    {currentStep.nodes[0]?.floor ? (
                                        <Text style={styles.stepFloor}>Floor {currentStep.nodes[0].floor} - {currentStep.nodes[0].building}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.currentBadge}>
                                    <Text style={styles.currentBadgeText}>Current Step</Text>
                                </View>
                            </Animated.View>
                        ) : null}

                        <TouchableOpacity style={styles.thenRow} onPress={() => setShowAllSteps((prev) => !prev)} activeOpacity={0.82}>
                            <Text style={styles.thenText} numberOfLines={1}>
                                {nextStep
                                    ? `Then: ${nextStep.description}${nextStep.distance > 0 ? ` ${nextStep.distance.toFixed(2)}m` : ""}`
                                    : "Then: You have arrived at your destination"}
                            </Text>
                            <Text style={styles.thenChevron}>{showAllSteps ? "^" : "v"}</Text>
                        </TouchableOpacity>

                        {showAllSteps ? (
                            <ScrollView
                                ref={scrollRef}
                                style={styles.expandedSteps}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={true}
                                bounces={false}
                            >
                                {remainingSteps.map((step, idx) => (
                                    <View key={`step-${currentIndex + 1}-${idx}`} style={styles.stepRow}>
                                        <View style={styles.iconWrap}>
                                            <Image
                                                source={getDirectionImage(step.direction)}
                                                style={styles.directionImage}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <View style={styles.stepTextWrap}>
                                            <Text style={styles.stepTitle}>{step.description}</Text>
                                            {step.distance > 0 ? <Text style={styles.stepSub}>{step.distance.toFixed(1)} m</Text> : null}
                                            {step.nodes[0]?.floor ? (
                                                <Text style={styles.stepFloor}>Floor {step.nodes[0].floor} - {step.nodes[0].building}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                ))}
                                <View style={{ height: 10 }} />
                            </ScrollView>
                        ) : null}
                    </View>
                ) : (
                    <View style={styles.preStartContainer}>
                        <View style={styles.preStartHeader}>
                            <Text style={styles.preStartLabel}>Walk</Text>
                        </View>
                        <View style={styles.preStartRow}>
                            <View style={styles.preStartEta}>
                                <Text style={styles.preStartMin}>{Math.ceil((steps.reduce((sum, s) => sum + s.distance, 0) / 4000) * 60)}</Text>
                                <Text style={styles.preStartMinLabel}>min</Text>
                            </View>
                            <View style={styles.preStartInfo}>
                                <Text style={styles.preStartArrive}>Arrive at {destLabel}</Text>
                                <Text style={styles.preStartDist}>{steps.reduce((sum, s) => sum + s.distance, 0).toFixed(0)} m</Text>
                            </View>
                            <TouchableOpacity style={styles.startBtn} onPress={() => setHasStarted(true)}>
                                <Text style={styles.startBtnText}>Start</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Animated.View>

            {hasStarted ? (
                <View style={styles.bottomBar}>
                    <View style={styles.bottomStat}>
                        <Text style={styles.bottomStatValue}>{formatArrivalTime(remainingMinutes)}</Text>
                        <Text style={styles.bottomStatLabel}>arrival</Text>
                    </View>
                    <View style={styles.bottomDivider} />
                    <View style={styles.bottomStat}>
                        <Text style={styles.bottomStatValue}>{remainingMinutes}</Text>
                        <Text style={styles.bottomStatLabel}>min</Text>
                    </View>
                    <View style={styles.bottomDivider} />
                    <View style={styles.bottomStat}>
                        <Text style={styles.bottomStatValue}>{remainingDistance} m</Text>
                        <Text style={styles.bottomStatLabel}>remain</Text>
                    </View>
                    <TouchableOpacity style={styles.endBtn} onPress={onClose} activeOpacity={0.82}>
                        <Text style={styles.endBtnText}>End</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },
    overlayTop: { justifyContent: "flex-start" },
    sheet: { backgroundColor: BG },
    bottomSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    topSheet: { marginHorizontal: 8, marginTop: 35, borderRadius: 22, overflow: "hidden" },
    handleArea: { width: "100%", alignItems: "center", paddingVertical: 10 },
    handleBar: { width: 38, height: 4, backgroundColor: "#DDD", borderRadius: 2 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
    headerLeft: { flex: 1 },
    headerDest: { fontSize: 17, fontWeight: "700", color: DARK, letterSpacing: -0.3 },
    progressLabel: { fontSize: 12, color: MUTED, marginTop: 4, fontWeight: "600" },
    navRow: { flexDirection: "row", gap: 10, marginHorizontal: 18, marginTop: 8, marginBottom: 6 },
    navBtnBack: { flex: 1, backgroundColor: "#F0F0F0", borderRadius: 13, paddingVertical: 13, alignItems: "center" },
    navBtnNext: { flex: 1, backgroundColor: AMBER, borderRadius: 13, paddingVertical: 13, alignItems: "center" },
    navBtnDisabled: { backgroundColor: "#F0F0F0" },
    navBtnTextBack: { color: "#374151", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    navBtnTextNext: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    navBtnTextDisabled: { color: "#CCCCCC" },
    navBtnArrived: { backgroundColor: AMBER },
    listContent: { paddingBottom: 8 },
    currentStepRow: { borderTopWidth: 1, borderTopColor: "#EEEEEE" },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        flexShrink: 0,
    },
    directionImage: { width: 28, height: 28 },
    stepTextWrap: { flex: 1 },
    stepTitle: { fontSize: 16, fontWeight: "600", color: DARK, lineHeight: 22 },
    stepSub: { fontSize: 12, color: DARK, marginTop: 1, fontWeight: "500" },
    stepFloor: { fontSize: 11, color: AMBER, marginTop: 2, fontWeight: "600" },
    currentBadge: { backgroundColor: AMBER, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6, flexShrink: 0 },
    currentBadgeText: { color: BG, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
    thenRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
    },
    thenText: { flex: 1, fontSize: 14, color: MUTED, fontWeight: "600" },
    thenChevron: { fontSize: 14, color: MUTED, fontWeight: "700" },
    expandedSteps: { maxHeight: 240 },
    preStartContainer: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 18 },
    preStartHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    preStartLabel: { fontSize: 16, fontWeight: "600", color: DARK },
    preStartRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    preStartEta: { alignItems: "center", minWidth: 36 },
    preStartMin: { fontSize: 22, fontWeight: "700", color: "#10B981" },
    preStartMinLabel: { fontSize: 11, color: "#10B981", fontWeight: "500" },
    preStartInfo: { flex: 1 },
    preStartArrive: { fontSize: 14, fontWeight: "600", color: DARK },
    preStartDist: { fontSize: 12, color: MUTED, marginTop: 2 },
    startBtn: { backgroundColor: "#9D1E30", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
    startBtnText: { color: BG, fontSize: 14, fontWeight: "700" },
    bottomBar: {
        position: "absolute",
        left: 8,
        right: 8,
        bottom: 16,
        backgroundColor: BG,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    bottomStat: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
    },
    bottomStatValue: {
        fontSize: 17,
        fontWeight: "700",
        color: DARK,
    },
    bottomStatLabel: {
        fontSize: 11,
        color: MUTED,
        marginTop: 2,
    },
    bottomDivider: {
        width: 1,
        height: 32,
        backgroundColor: "#E5E7EB",
    },
    endBtn: {
        backgroundColor: AMBER,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    endBtnText: {
        color: BG,
        fontSize: 15,
        fontWeight: "700",
    },
});

export default DirectionsModal;