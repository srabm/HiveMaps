import { IndoorDirectionsResponse, IndoorNodeResponse } from "@/services/http/indoor-api";
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions, Image, PanResponder, DimensionValue,} from "react-native";

const AMBER       = "#E8A020";
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

export interface DirectionsModalProps {
    visible: boolean;
    steps: IndoorDirectionsResponse[];
    origin?: string;
    destination?: string;
    onClose: () => void;
    onCurrentNodeChange?: (node: IndoorNodeResponse) => void;
    beeImageSource?: any;
}

/**
 * Returns the first node of a step — this represents the user's current
 * position when they are on that step.
 */
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
                                                             beeImageSource,
                                                         }) => {

    // steps = [
    //     ...steps,
    //     {
    //         direction: "ARRIVED",
    //         distance: 0.0,
    //         description: "You have arrived at your destination",
    //         nodes: [ steps[steps.length - 1].nodes[steps[steps.length - 1].nodes.length - 1] ]
    //     }
    // ];
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


    useEffect(() => {
        if (!visible) return;
        if (!steps[currentIndex]) return;  // ← add this line
        const node = getFirstNode(steps[currentIndex]);
        if (node && onCurrentNodeChange) {
            onCurrentNodeChange(node);
        }
    }, [currentIndex, visible]);

    // Open / close sheet
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setSheetHeight(DEFAULT_HEIGHT);
            fadeAnim.setValue(1);
            Animated.timing(sheetAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        } else {
            Animated.timing(sheetAnim, { toValue: DEFAULT_HEIGHT, duration: 220, useNativeDriver: true }).start();
        }
    }, [visible]);

    // Scroll to top on step change
    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [currentIndex]);

    useEffect(() => {
        if (!visible) setHasStarted(false);
    }, [visible]);

    // ── Drag handle pan responder ─────────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder:  () => true,

            onPanResponderGrant: (_, gs) => {
                dragStartY.current = gs.y0;
                dragStartH.current = sheetHeight;
            },

            onPanResponderMove: (_, gs) => {
                const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current - gs.dy));
                setSheetHeight(newH);
            },

            onPanResponderRelease: () => {
                if (sheetHeight < DEFAULT_HEIGHT * 0.5) {
                    onClose();
                }
            },
        })
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
            setCurrentIndex(prev => prev + 1);
        });
    };

    const goBack = () => {
        if (isFirst) return;
        animateTransition(() => {
            setCurrentIndex(prev => prev - 1);
        });
    };

    return (
        <View style={styles.overlay} pointerEvents="box-none">

            <Animated.View style={[styles.sheet, { height: hasStarted ? sheetHeight : "auto", transform: [{ translateY: sheetAnim }] }]}>

                {/* Draggable handle */}
                <View style={styles.handleArea} {...panResponder.panHandlers}>
                    <View style={styles.handleBar} />
                </View>

                {!hasStarted ? (
                    <View style={styles.preStartContainer}>
                        <View style={styles.preStartHeader}>
                            <Text style={styles.preStartLabel}>Walk</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.preStartRow}>
                            <View style={styles.preStartEta}>
                                <Text style={styles.preStartMin}>{Math.ceil((steps.reduce((sum, s) => sum + s.distance, 0) / 4000) * 60)}</Text>
                                <Text style={styles.preStartMinLabel}>min</Text>
                            </View>
                            <View style={styles.preStartInfo}>
                                <Text style={styles.preStartArrive}>Arrive at {destLabel}</Text>
                                <Text style={styles.preStartDist}>
                                    {steps.reduce((sum, s) => sum + s.distance, 0).toFixed(0)} m
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.startBtn} onPress={() => setHasStarted(true)}>
                                <Text style={styles.startBtnText}> Start</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    ) :(
                    <View style={{ flex: 1 }}>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.headerDest} numberOfLines={1}> End Destination: {destLabel}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Progress */}
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: progressPct }]} />
                        </View>
                        <Text style={styles.progressLabel}>Step {Math.min(currentIndex + 1, totalSteps)} of {totalSteps}</Text>

                        {/* Back / Forward buttons */}
                        <View style={styles.navRow}>
                            <TouchableOpacity
                                style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
                                onPress={goBack}
                                activeOpacity={isFirst ? 1 : 0.82}
                                disabled={isFirst}
                            >
                                <Text style={[styles.navBtnText1, isFirst && styles.navBtnTextDisabled]}>Back</Text>
                            </TouchableOpacity>

                            {isLast ? (
                                <View style={[styles.navBtn, styles.navBtnArrived]}>
                                    <Text style={styles.navBtnArrivedText}>Arrived</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.navBtn1} onPress={goForward} activeOpacity={0.82}>
                                    <Text style={styles.navBtnText2}>Next</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.stepRow} />

                        {/* Scrollable list */}
                        <ScrollView
                            ref={scrollRef}
                            style={{ height: listH }}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                            onScrollBeginDrag={() => { isScrolling.current = true; }}
                            onScrollEndDrag={() => { isScrolling.current = false; }}
                        >
                            {/* Origin / bee row */}
                            <View style={styles.stepRow}>
                                <View style={styles.iconWrap}>
                                    {beeImageSource
                                        ? <Image source={beeImageSource} style={styles.directionImage} resizeMode="contain" />
                                        : <Image source={require("@/assets/images/bee.png")} style={styles.directionImage} resizeMode="contain" />
                                    }
                                </View>
                                <View style={styles.stepTextWrap}>
                                    <Text style={styles.stepTitle}>{origin}</Text>
                                    <Text style={styles.stepSub}>Starting point</Text>
                                </View>
                            </View>

                            <View />

                            {/* Direction rows */}
                            {remainingSteps.map((step, idx) => {
                                const isCurrentStep = idx === 0;
                                const isLastRow     = idx === remainingSteps.length - 1;

                                return (
                                    <React.Fragment key={`s-${currentIndex}-${idx}`}>
                                        <Animated.View style={[styles.stepRow, isCurrentStep && { opacity: fadeAnim }]}>
                                            <View style={styles.iconWrap}>
                                                <Image
                                                    source={getDirectionImage(step.direction)}
                                                    style={styles.directionImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <View style={styles.stepTextWrap}>
                                                <Text style={styles.stepTitle}>{step.description}</Text>
                                                {step.distance > 0 && (
                                                    <Text style={styles.stepSub}>{step.distance.toFixed(1)} m</Text>
                                                )}
                                                {step.nodes[0]?.floor && (
                                                    <Text style={styles.stepFloor}>Floor {step.nodes[0].floor} · {step.nodes[0].building}</Text>
                                                )}
                                            </View>
                                            {isCurrentStep && (
                                                <View style={styles.currentBadge}>
                                                    <Text style={styles.currentBadgeText}>Current Step</Text>
                                                </View>
                                            )}
                                        </Animated.View>
                                        {!isLastRow && <View />}
                                    </React.Fragment>
                                );
                            })}

                            <View style={{ height: 20 }} />
                        </ScrollView>

                    </View>
                )}

            </Animated.View>
        </View>
    );
};


const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },
    sheet:                { backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    handleArea:           { width: "100%", alignItems: "center", paddingVertical: 10 },
    handleBar:            { width: 38, height: 4, backgroundColor: "#DDD", borderRadius: 2 },
    header:               { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 10 },
    headerLeft:           { flex: 1 },
    headerChip:           { backgroundColor: AMBER_LIGHT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 3 },
    headerChipText:       { color: AMBER, fontSize: 10, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase" },
    headerDest:           { fontSize: 17, fontWeight: "700", color: DARK, letterSpacing: -0.3 },
    closeBtn:             { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F2", justifyContent: "center", alignItems: "center", marginLeft: 10 },
    closeBtnText:         { fontSize: 13, color: "#555", fontWeight: "600" },
    progressTrack:        { height: 3, backgroundColor: BORDER, marginHorizontal: 18, borderRadius: 2, overflow: "hidden" },
    progressFill:         { height: "100%", backgroundColor: AMBER, borderRadius: 2 },
    progressLabel:        { fontSize: 11, color: MUTED, marginHorizontal: 18, marginTop: 5, marginBottom: 2, fontWeight: "500" },
    navRow:               { flexDirection: "row", gap: 10, marginHorizontal: 18, marginTop: 8, marginBottom: 4 },
    navBtn:               { flex: 1, backgroundColor: "#FF0000", borderRadius: 13, paddingVertical: 13, alignItems: "center" },
    navBtn1:               { flex: 1, backgroundColor: "#FFD400", borderRadius: 13, paddingVertical: 13, alignItems: "center" },
    navBtnDisabled:       { backgroundColor: "#F0F0F0" },
    navBtnText:           { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    navBtnText1:           { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    navBtnText2:           { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
    navBtnTextDisabled:   { color: "#CCCCCC" },
    navBtnArrived:        { backgroundColor: AMBER_LIGHT, borderWidth: 1.5, borderColor: AMBER },
    navBtnArrivedText:    { color: AMBER, fontSize: 14, fontWeight: "700" },
    listContent:          { paddingHorizontal: 18, paddingTop: 6 },
    stepRow:              { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: "#888888", marginHorizontal: -18 },
    iconWrap:             { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center", marginRight: 12, flexShrink: 0 },
    directionImage:       { width: 28, height: 28 },
    stepTextWrap:         { flex: 1 },
    stepTitle: { fontSize: 16, fontWeight: "600", color: DARK, lineHeight: 22 },
    stepSub:              { fontSize: 12, color: DARK, marginTop: 1, fontWeight: "500" },
    stepFloor:            { fontSize: 11, color: AMBER, marginTop: 2, fontWeight: "600" },
    currentBadge:         { backgroundColor: AMBER, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6, flexShrink: 0 },
    currentBadgeText:     { color: BG, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
    stepRowFirst:         { borderTopWidth: 1, borderTopColor: "#888888" },
    preStartContainer:  { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 18 },
    preStartHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    preStartLabel:      { fontSize: 16, fontWeight: "600", color: DARK },
    preStartRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
    preStartEta:        { alignItems: "center", minWidth: 36 },
    preStartMin:        { fontSize: 22, fontWeight: "700", color: AMBER },
    preStartMinLabel:   { fontSize: 11, color: MUTED, fontWeight: "500" },
    preStartInfo:       { flex: 1 },
    preStartArrive:     { fontSize: 14, fontWeight: "600", color: DARK },
    preStartDist:       { fontSize: 12, color: MUTED, marginTop: 2 },
    startBtn:           { backgroundColor: "#FF0000", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
    startBtnText:       { color: BG, fontSize: 14, fontWeight: "700" },
});

export default DirectionsModal;


/*

There is a default direction inside this tsx file. This needs toe be removed once everything is working fine.
The Onclose can be used to close or open the modal when necessary. It is passing a boolean to the parent that calls upon it.
 Default call : <DirectionsModal visible={true} onClose={() => setIsOpen(false)} />


Normal call :  <DirectionsModal
                visible={modalOpen}
                steps={route}
                origin="Your location"
                destination="LB251 Webster Library"
                onClose={handleClose}
                onCurrentNodeChange={handleNodeChange}
                beeImageSource={require("@/assets/images/bee.png")}
            />

            The "steps" variable is the json file you get from the backend that you give as input. The onCurrentNodeChange return the node
            where the user is located in (moving towards or smt).

            Need to insert images for the different directions. See the top of the file

 */