import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Step } from '@/services/maps/directions-api-adapter';
import type { LiveLocation } from './use-live-location';

/** Radius in metres within which we consider a step's endpoint "reached". */
const STEP_ARRIVAL_THRESHOLD_M = 40;

/**
 * How far off the route (metres) before counting as an off-route reading.
 * Generous enough for GPS drift and curved roads.
 */
const OFF_ROUTE_THRESHOLD_M = 35;

/**
 * How many consecutive off-route readings before triggering recalculation.
 * At ~2 s per reading, 5 readings = ~10 s of sustained deviation.
 * This prevents false positives from momentary GPS jumps.
 */
const OFF_ROUTE_CONSECUTIVE_REQUIRED = 5;

// ─── Geometry helpers ────────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Haversine distance in metres between two lat/lon pairs. */
export function distanceMetres(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
): number {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Minimum distance in metres from point P to line segment AB. */
function distanceToSegmentMetres(
    pLat: number, pLon: number,
    aLat: number, aLon: number,
    bLat: number, bLon: number,
): number {
    const abLat = bLat - aLat;
    const abLon = bLon - aLon;
    const abLenSq = abLat * abLat + abLon * abLon;

    if (abLenSq === 0) return distanceMetres(pLat, pLon, aLat, aLon);

    const t = Math.max(0, Math.min(1,
        ((pLat - aLat) * abLat + (pLon - aLon) * abLon) / abLenSq,
    ));

    return distanceMetres(pLat, pLon, aLat + t * abLat, aLon + t * abLon);
}

/**
 * Decode a Mapbox-encoded polyline string into [lon, lat] pairs.
 * Returns an empty array if the string is missing or malformed.
 */
function decodePolyline(encoded: string): Array<[number, number]> {
    if (!encoded) return [];
    const points: Array<[number, number]> = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let result = 0, shift = 0, byte: number;
        do {
            byte = (encoded.codePointAt(index++) ?? 0) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : result >> 1;

        result = 0; shift = 0;
        do {
            byte = (encoded.codePointAt(index++) ?? 0) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : result >> 1;

        points.push([lng / 1e5, lat / 1e5]);
    }
    return points;
}

/**
 * Minimum distance from a point to ANY segment across all remaining steps.
 *
 * When a step has a per-step `polyline`, we decode it and check every
 * segment — this handles curves and diagonal roads accurately.
 * Falls back to the single start→end segment when polyline is absent
 * (e.g. Google Maps transit steps).
 *
 * We only look at steps from `fromStepIndex` onward to avoid falsely
 * matching against already-completed segments behind the user.
 */
function distanceToRemainingRoute(
    lat: number, lon: number,
    steps: Step[],
    fromStepIndex: number,
): number {
    let minDist = Infinity;

    for (let i = fromStepIndex; i < steps.length; i++) {
        const step = steps[i];

        if (step.polyline) {
            // Use the full decoded polyline for this step
            const coords = decodePolyline(step.polyline);
            for (let j = 0; j + 1 < coords.length; j++) {
                const [aLon, aLat] = coords[j];
                const [bLon, bLat] = coords[j + 1];
                const d = distanceToSegmentMetres(lat, lon, aLat, aLon, bLat, bLon);
                if (d < minDist) minDist = d;
                if (minDist < 5) return minDist; // close enough — stop early
            }
        } else {
            // Fallback: single start→end segment
            const d = distanceToSegmentMetres(
                lat, lon,
                step.startLocation.latitude, step.startLocation.longitude,
                step.endLocation.latitude, step.endLocation.longitude,
            );
            if (d < minDist) minDist = d;
        }

        if (minDist < 5) return minDist;
    }

    return minDist;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type StepNavigatorState = {
    currentStepIndex: number;
    currentStep: Step | null;
    nextStep: Step | null;
    afterNextStep: Step | null;
    distanceToNextTurn: number | null;
    totalDistanceRemaining: number | null;
    arrived: boolean;
    isOffRoute: boolean;
    clearOffRoute: () => void;
    advanceStep: () => void;
    retreatStep: () => void;
    reset: () => void;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Drives turn-by-turn navigation through a normalised Step[] array.
 *
 * - Auto-advances when the user is within STEP_ARRIVAL_THRESHOLD_M of step end.
 * - Sets `isOffRoute` after OFF_ROUTE_CONSECUTIVE_REQUIRED consecutive GPS
 *   readings that are all > OFF_ROUTE_THRESHOLD_M from the remaining polyline.
 *   Using the per-step polyline avoids false positives on curved roads.
 * - Pass `disableOffRouteDetection=true` for shuttle mode.
 */
export function useStepNavigator(
    steps: Step[],
    liveLocation: LiveLocation | null,
    disableOffRouteDetection = false,
): StepNavigatorState {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isOffRoute, setIsOffRoute] = useState(false);
    const advancedRef = useRef<Set<number>>(new Set());
    const prevStepsRef = useRef(steps);
    const offRouteCountRef = useRef(0);

    // Reset when the steps array reference changes (new route loaded).
    useEffect(() => {
        if (prevStepsRef.current !== steps) {
            prevStepsRef.current = steps;
            setCurrentStepIndex(0);
            setIsOffRoute(false);
            advancedRef.current = new Set();
            offRouteCountRef.current = 0;
        }
    }, [steps]);

    // Auto-advance + off-route detection on every GPS update.
    useEffect(() => {
        if (!liveLocation || !steps.length) return;

        const step = steps[currentStepIndex];
        if (!step) return;

        const distToEnd = distanceMetres(
            liveLocation.latitude, liveLocation.longitude,
            step.endLocation.latitude, step.endLocation.longitude,
        );

        // ── Auto-advance ──────────────────────────────────────────────────
        if (distToEnd <= STEP_ARRIVAL_THRESHOLD_M && !advancedRef.current.has(currentStepIndex)) {
            advancedRef.current.add(currentStepIndex);
            offRouteCountRef.current = 0;
            setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
            return;
        }

        // ── Off-route detection ───────────────────────────────────────────
        if (disableOffRouteDetection || isOffRoute) return;

        const distToRoute = distanceToRemainingRoute(
            liveLocation.latitude, liveLocation.longitude,
            steps,
            currentStepIndex,
        );

        if (distToRoute > OFF_ROUTE_THRESHOLD_M) {
            offRouteCountRef.current += 1;
            console.log(
                '[StepNavigator] Off-route reading ' +
                offRouteCountRef.current + '/' + OFF_ROUTE_CONSECUTIVE_REQUIRED +
                ' — ' + Math.round(distToRoute) + 'm from route'
            );
            if (offRouteCountRef.current >= OFF_ROUTE_CONSECUTIVE_REQUIRED) {
                console.warn('[StepNavigator] Off-route confirmed — triggering recalculation');
                setIsOffRoute(true);
            }
        } else {
            // Back within tolerance — reset the counter
            if (offRouteCountRef.current > 0) {
                console.log('[StepNavigator] Back on route, resetting counter');
                offRouteCountRef.current = 0;
            }
        }
    }, [liveLocation, currentStepIndex, steps, disableOffRouteDetection, isOffRoute]);

    const distanceToNextTurn = useMemo(() => {
        if (!liveLocation || !steps.length) return null;
        const step = steps[currentStepIndex];
        if (!step) return null;
        return distanceMetres(
            liveLocation.latitude, liveLocation.longitude,
            step.endLocation.latitude, step.endLocation.longitude,
        );
    }, [liveLocation, currentStepIndex, steps]);

    const totalDistanceRemaining = useMemo(() => {
        if (!steps.length) return null;
        let total = distanceToNextTurn ?? 0;
        for (let i = currentStepIndex + 1; i < steps.length; i++) {
            total += steps[i].distance;
        }
        return total;
    }, [steps, currentStepIndex, distanceToNextTurn]);

    const arrived =
        steps.length > 0 &&
        currentStepIndex >= steps.length - 1 &&
        distanceToNextTurn !== null &&
        distanceToNextTurn <= STEP_ARRIVAL_THRESHOLD_M;

    const clearOffRoute = useCallback(() => {
        setIsOffRoute(false);
        offRouteCountRef.current = 0;
    }, []);

    const advanceStep = useCallback(() => {
        setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)));
    }, [steps.length]);

    const retreatStep = useCallback(() => {
        setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    }, []);

    const reset = useCallback(() => {
        setCurrentStepIndex(0);
        setIsOffRoute(false);
        advancedRef.current = new Set();
        offRouteCountRef.current = 0;
    }, []);

    return {
        currentStepIndex,
        currentStep: steps[currentStepIndex] ?? null,
        nextStep: steps[currentStepIndex + 1] ?? null,
        afterNextStep: steps[currentStepIndex + 2] ?? null,
        distanceToNextTurn,
        totalDistanceRemaining,
        arrived,
        isOffRoute,
        clearOffRoute,
        advanceStep,
        retreatStep,
        reset,
    };
}