import { renderHook, act } from '@testing-library/react-native';
import { useStepNavigator, distanceMetres } from '@/hooks/use-step-navigator';
import type { Step } from '@/services/maps/directions-api-adapter';
import type { LiveLocation } from '@/hooks/use-live-location';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Build a minimal Step. start/end are [lon, lat] for brevity. */
function makeStep(
    startLonLat: [number, number],
    endLonLat: [number, number],
    overrides: Partial<Step> = {},
): Step {
    return {
        distance: distanceMetres(
            startLonLat[1], startLonLat[0],
            endLonLat[1],   endLonLat[0],
        ),
        duration: 60,
        instruction: 'Continue',
        maneuver: 'continue',
        startLocation: { latitude: startLonLat[1], longitude: startLonLat[0] },
        endLocation:   { latitude: endLonLat[1],   longitude: endLonLat[0] },
        ...overrides,
    };
}

function makeLoc(lat: number, lon: number, heading: number | null = null): LiveLocation {
    return { latitude: lat, longitude: lon, heading, accuracy: 5 };
}

// Three-step walk route on the SGW campus (roughly)
const STEP_A = makeStep([-73.5785, 45.4971], [-73.5788, 45.4968], { maneuver: 'depart', duration: 30 });
const STEP_B = makeStep([-73.5788, 45.4968], [-73.5792, 45.4964], { maneuver: 'turn',   duration: 45 });
const STEP_C = makeStep([-73.5792, 45.4964], [-73.5795, 45.4961], { maneuver: 'arrive', duration: 10, distance: 40 });

const THREE_STEPS = [STEP_A, STEP_B, STEP_C];

// ─── distanceMetres (exported helper) ────────────────────────────────────────

describe('distanceMetres', () => {
    it('returns 0 for identical points', () => {
        expect(distanceMetres(45.4971, -73.5785, 45.4971, -73.5785)).toBe(0);
    });

    it('returns a positive value for distinct points', () => {
        const d = distanceMetres(45.4971, -73.5785, 45.4968, -73.5788);
        expect(d).toBeGreaterThan(0);
    });

    it('is roughly symmetric', () => {
        const d1 = distanceMetres(45.4971, -73.5785, 45.4964, -73.5792);
        const d2 = distanceMetres(45.4964, -73.5792, 45.4971, -73.5785);
        expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });

    it('approximately matches known short distance', () => {
        // ~44 m for the first SGW step in the convert-mapbox fixture
        const d = distanceMetres(45.497116, -73.578528, 45.497034, -73.578610);
        expect(d).toBeGreaterThan(5);
        expect(d).toBeLessThan(200);
    });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useStepNavigator — initial state', () => {
    it('starts at step 0', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.currentStep).toBe(STEP_A);
    });

    it('nextStep is step 1', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.nextStep).toBe(STEP_B);
    });

    it('afterNextStep is step 2', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.afterNextStep).toBe(STEP_C);
    });

    it('is not arrived', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.arrived).toBe(false);
    });

    it('isOffRoute is false', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.isOffRoute).toBe(false);
    });

    it('nulls out distanceToNextTurn when no location, but still computes totals', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.distanceToNextTurn).toBeNull();
        expect(result.current.totalDistanceRemaining).not.toBeNull();
        expect(result.current.totalDurationSecondsRemaining).not.toBeNull();
    });

    it('shuttlePhase is null for non-shuttle mode', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        expect(result.current.shuttlePhase).toBeNull();
    });
});

// ─── Manual controls ─────────────────────────────────────────────────────────

describe('useStepNavigator — manual controls', () => {
    it('advanceStep increments the step index', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.advanceStep());
        expect(result.current.currentStepIndex).toBe(1);
        expect(result.current.currentStep).toBe(STEP_B);
    });

    it('advanceStep does not go past last step', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.advanceStep());
        act(() => result.current.advanceStep());
        act(() => result.current.advanceStep()); // would be step 3 — doesn't exist
        expect(result.current.currentStepIndex).toBe(2);
    });

    it('retreatStep decrements the step index', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.advanceStep());
        act(() => result.current.retreatStep());
        expect(result.current.currentStepIndex).toBe(0);
    });

    it('retreatStep does not go below 0', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.retreatStep());
        expect(result.current.currentStepIndex).toBe(0);
    });

    it('reset returns to step 0 and clears off-route', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.advanceStep());
        act(() => result.current.reset());
        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.isOffRoute).toBe(false);
    });

    it('clearOffRoute resets isOffRoute to false', () => {
        // Manually verify clearOffRoute is callable and returns false
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.clearOffRoute());
        expect(result.current.isOffRoute).toBe(false);
    });
});

// ─── Auto-advance on GPS ──────────────────────────────────────────────────────

describe('useStepNavigator — auto-advance', () => {
    it('advances when user is within 30 m of step end', () => {
        // Place user right on top of step A's end point
        const atStepAEnd = makeLoc(
            STEP_A.endLocation.latitude,
            STEP_A.endLocation.longitude,
        );
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, atStepAEnd),
        );
        expect(result.current.currentStepIndex).toBe(1);
    });

    it('does not advance when user is far from step end', () => {
        // Place user near step A's start (far from end)
        const farFromEnd = makeLoc(
            STEP_A.startLocation.latitude,
            STEP_A.startLocation.longitude,
        );
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, farFromEnd),
        );
        expect(result.current.currentStepIndex).toBe(0);
    });

    it('advances through multiple steps when user is at the end', () => {
        const atLastStepEnd = makeLoc(
            STEP_C.endLocation.latitude,
            STEP_C.endLocation.longitude,
        );
        const { result, rerender } = renderHook(
            ({ loc }) => useStepNavigator(THREE_STEPS, loc),
            { initialProps: { loc: null as LiveLocation | null } },
        );
        // Step through each end point
        act(() => rerender({ loc: makeLoc(STEP_A.endLocation.latitude, STEP_A.endLocation.longitude) }));
        expect(result.current.currentStepIndex).toBe(1);
        act(() => rerender({ loc: makeLoc(STEP_B.endLocation.latitude, STEP_B.endLocation.longitude) }));
        expect(result.current.currentStepIndex).toBe(2);
        act(() => rerender({ loc: atLastStepEnd }));
        expect(result.current.arrived).toBe(true);
    });
});

// ─── Arrived ─────────────────────────────────────────────────────────────────

describe('useStepNavigator — arrived', () => {
    it('reports arrived when at last step end', () => {
        const atEnd = makeLoc(
            STEP_C.endLocation.latitude,
            STEP_C.endLocation.longitude,
        );
        const { result } = renderHook(() =>
            useStepNavigator([STEP_C], atEnd),
        );
        expect(result.current.arrived).toBe(true);
    });

    it('does not report arrived when on middle step', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, null),
        );
        act(() => result.current.advanceStep());
        expect(result.current.arrived).toBe(false);
    });
});

// ─── Distance / duration remaining ───────────────────────────────────────────

describe('useStepNavigator — remaining estimates', () => {
    it('totalDistanceRemaining includes remaining steps distance', () => {
        const atStepAMidpoint = makeLoc(
            (STEP_A.startLocation.latitude + STEP_A.endLocation.latitude) / 2,
            (STEP_A.startLocation.longitude + STEP_A.endLocation.longitude) / 2,
        );
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, atStepAMidpoint),
        );
        // Should be > 0
        expect(result.current.totalDistanceRemaining).not.toBeNull();
        expect(result.current.totalDistanceRemaining!).toBeGreaterThan(0);
    });

    it('totalDurationSecondsRemaining is a positive number when en-route', () => {
        const loc = makeLoc(
            STEP_A.startLocation.latitude,
            STEP_A.startLocation.longitude,
        );
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, loc),
        );
        expect(result.current.totalDurationSecondsRemaining).not.toBeNull();
        expect(result.current.totalDurationSecondsRemaining!).toBeGreaterThan(0);
    });

    it('totalDurationSecondsRemaining decreases as user advances', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, makeLoc(STEP_A.startLocation.latitude, STEP_A.startLocation.longitude)),
        );
        const initial = result.current.totalDurationSecondsRemaining!;
        act(() => result.current.advanceStep());
        // After advancing, only steps B and C remain — should be less
        const afterAdvance = result.current.totalDurationSecondsRemaining!;
        expect(afterAdvance).toBeLessThan(initial);
    });
});

// ─── New route resets state ───────────────────────────────────────────────────

describe('useStepNavigator — new route resets', () => {
    const STEP_X = makeStep([-73.579, 45.498], [-73.580, 45.497], { maneuver: 'depart' });
    const STEP_Y = makeStep([-73.580, 45.497], [-73.581, 45.496], { maneuver: 'arrive', distance: 100 });
    const NEW_ROUTE = [STEP_X, STEP_Y];

    it('resets to step 0 when steps array reference changes', () => {
        const { result, rerender } = renderHook(
            ({ steps }) => useStepNavigator(steps, null),
            { initialProps: { steps: THREE_STEPS } },
        );
        act(() => result.current.advanceStep());
        expect(result.current.currentStepIndex).toBe(1);

        act(() => rerender({ steps: NEW_ROUTE }));
        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.currentStep).toBe(STEP_X);
    });

    it('clears isOffRoute when route changes', () => {
        const { result, rerender } = renderHook(
            ({ steps }) => useStepNavigator(steps, null),
            { initialProps: { steps: THREE_STEPS } },
        );
        // Manually confirm clearOffRoute works and then verify reset on route change
        act(() => result.current.clearOffRoute());
        act(() => rerender({ steps: NEW_ROUTE }));
        expect(result.current.isOffRoute).toBe(false);
    });
});

// ─── Shuttle phase ────────────────────────────────────────────────────────────

describe('useStepNavigator — shuttle phase', () => {
    // 2 walk-to-stop, 1 shuttle, 2 walk-from-stop
    const boundaries = { walkToStopCount: 2, shuttleLegCount: 1 };
    const SHUTTLE_STEPS = [
        makeStep([-73.578, 45.497], [-73.579, 45.496], { maneuver: 'depart' }),
        makeStep([-73.579, 45.496], [-73.580, 45.495], { maneuver: 'arrive' }),
        makeStep([-73.580, 45.495], [-73.581, 45.494], { maneuver: 'depart' }), // shuttle
        makeStep([-73.581, 45.494], [-73.582, 45.493], { maneuver: 'continue' }),
        makeStep([-73.582, 45.493], [-73.583, 45.492], { maneuver: 'arrive', distance: 50 }),
    ];

    it('returns walk-to-stop for steps 0 and 1', () => {
        const { result } = renderHook(() =>
            useStepNavigator(SHUTTLE_STEPS, null, boundaries),
        );
        expect(result.current.shuttlePhase).toBe('walk-to-stop');

        act(() => result.current.advanceStep());
        expect(result.current.shuttlePhase).toBe('walk-to-stop');
    });

    it('returns shuttle for step 2', () => {
        const { result } = renderHook(() =>
            useStepNavigator(SHUTTLE_STEPS, null, boundaries),
        );
        act(() => result.current.advanceStep());
        act(() => result.current.advanceStep());
        expect(result.current.shuttlePhase).toBe('shuttle');
    });

    it('returns walk-from-stop for steps 3 and 4', () => {
        const { result } = renderHook(() =>
            useStepNavigator(SHUTTLE_STEPS, null, boundaries),
        );
        act(() => result.current.advanceStep());
        act(() => result.current.advanceStep());
        act(() => result.current.advanceStep());
        expect(result.current.shuttlePhase).toBe('walk-from-stop');

        act(() => result.current.advanceStep());
        expect(result.current.shuttlePhase).toBe('walk-from-stop');
    });

    it('shuttlePhase is null when no boundaries provided', () => {
        const { result } = renderHook(() =>
            useStepNavigator(SHUTTLE_STEPS, null),
        );
        expect(result.current.shuttlePhase).toBeNull();
    });
});

// ─── Off-route detection ──────────────────────────────────────────────────────

describe('useStepNavigator — off-route detection', () => {
    // OFF_ROUTE_THRESHOLD_M = 35, OFF_ROUTE_CONSECUTIVE_REQUIRED = 5
    const FAR_AWAY = makeLoc(45.510, -73.600); // clearly off any campus route

    it('does not flag off-route on first deviation', () => {
        const { result } = renderHook(() =>
            useStepNavigator(THREE_STEPS, FAR_AWAY),
        );
        // One reading is not enough
        expect(result.current.isOffRoute).toBe(false);
    });

    it('flags off-route after 5 consecutive far readings', () => {
        const { result, rerender } = renderHook(
            ({ loc }) => useStepNavigator(THREE_STEPS, loc),
            { initialProps: { loc: null as LiveLocation | null } },
        );
        for (let i = 0; i < 5; i++) {
            act(() => rerender({ loc: { ...FAR_AWAY, accuracy: 5 + i } })); // unique ref each tick
        }
        expect(result.current.isOffRoute).toBe(true);
    });

    it('resets off-route counter when user returns to route', () => {
        const { result, rerender } = renderHook(
            ({ loc }) => useStepNavigator(THREE_STEPS, loc),
            { initialProps: { loc: null as LiveLocation | null } },
        );
        // 3 off-route readings (not enough to trigger)
        for (let i = 0; i < 3; i++) {
            act(() => rerender({ loc: { ...FAR_AWAY, accuracy: 5 + i } }));
        }
        // User returns to the route
        act(() => rerender({
            loc: makeLoc(
                STEP_A.startLocation.latitude,
                STEP_A.startLocation.longitude,
            ),
        }));
        // 4 more off-route readings — counter was reset so still under threshold
        for (let i = 0; i < 4; i++) {
            act(() => rerender({ loc: { ...FAR_AWAY, accuracy: 10 + i } }));
        }
        expect(result.current.isOffRoute).toBe(false);
    });

    it('does not flag off-route during shuttle phase', () => {
        const boundaries = { walkToStopCount: 0, shuttleLegCount: 3 };
        const shuttleSteps = THREE_STEPS; // treat all 3 as shuttle ride
        const { result, rerender } = renderHook(
            ({ loc }) => useStepNavigator(shuttleSteps, loc, boundaries),
            { initialProps: { loc: null as LiveLocation | null } },
        );
        for (let i = 0; i < 10; i++) {
            act(() => rerender({ loc: { ...FAR_AWAY, accuracy: 5 + i } }));
        }
        expect(result.current.isOffRoute).toBe(false);
    });

    it('clearOffRoute resets isOffRoute after it was set', () => {
        const { result, rerender } = renderHook(
            ({ loc }) => useStepNavigator(THREE_STEPS, loc),
            { initialProps: { loc: null as LiveLocation | null } },
        );
        for (let i = 0; i < 5; i++) {
            act(() => rerender({ loc: { ...FAR_AWAY, accuracy: 5 + i } }));
        }
        expect(result.current.isOffRoute).toBe(true);
        act(() => result.current.clearOffRoute());
        expect(result.current.isOffRoute).toBe(false);
    });
});

// ─── Polyline-based off-route detection (lines 62–85) ────────────────────────
//
// Steps that carry an encoded polyline string use the full decoded segment
// path for off-route distance calculations rather than the simple start→end
// fallback. This tests both the decodePolyline path and the segment-walking
// loop inside distanceToRemainingRoute.

describe('useStepNavigator — polyline-based distance calculation (lines 62–85)', () => {
    // Encoded polyline for 3-point path near SGW campus:
    //   (45.4971, -73.5785) → (45.4968, -73.5788) → (45.4964, -73.5792)
    // Generated with standard Mapbox polyline encoding (precision 1e5).
    const ENCODED = '{cutGrxa`Mz@z@nAnA';

    const stepsWithPolyline: Step[] = [
        {
            distance: 100,
            duration: 60,
            instruction: 'Walk southwest',
            maneuver: 'depart',
            startLocation: { latitude: 45.4971, longitude: -73.5785 },
            endLocation:   { latitude: 45.4964, longitude: -73.5792 },
            polyline: ENCODED,
        },
        {
            distance: 50,
            duration: 30,
            instruction: 'Arrive',
            maneuver: 'arrive',
            startLocation: { latitude: 45.4964, longitude: -73.5792 },
            endLocation:   { latitude: 45.4960, longitude: -73.5796 },
            polyline: ENCODED,
        },
    ];

    it('does not trigger off-route when user is on the polyline path', () => {
        // User is right on the first waypoint of the polyline
        const onRoute = makeLoc(45.4968, -73.5788);
        const { result, rerender } = renderHook(
            ({ gps }) => useStepNavigator(stepsWithPolyline, gps),
            { initialProps: { gps: onRoute } },
        );
        // 5 readings on the route — should never go off-route
        for (let i = 0; i < 5; i++) {
            act(() => rerender({ gps: { ...onRoute, accuracy: 5 + i } }));
        }
        expect(result.current.isOffRoute).toBe(false);
    });

    it('triggers off-route when user is far from the polyline path', () => {
        const offRoute = makeLoc(45.510, -73.700); // ~14 km away
        const { result, rerender } = renderHook(
            ({ gps }) => useStepNavigator(stepsWithPolyline, gps),
            { initialProps: { gps: offRoute } },
        );
        for (let i = 0; i < 5; i++) {
            act(() => rerender({ gps: { ...offRoute, accuracy: 5 + i } }));
        }
        expect(result.current.isOffRoute).toBe(true);
    });

    it('auto-advances using polyline step end location', () => {
        const { result, rerender } = renderHook(
            ({ gps }) => useStepNavigator(stepsWithPolyline, gps),
            { initialProps: { gps: null as LiveLocation | null } },
        );
        // Move to within 30 m of step 0 end
        const nearEnd = makeLoc(
            stepsWithPolyline[0].endLocation.latitude,
            stepsWithPolyline[0].endLocation.longitude,
        );
        act(() => rerender({ gps: nearEnd }));
        expect(result.current.currentStepIndex).toBe(1);
    });

    it('handles empty polyline string — falls back to segment calculation', () => {
        const stepsEmptyPoly: Step[] = [{
            ...stepsWithPolyline[0],
            polyline: '', // empty — should fall back to start→end segment
        }];
        const onRoute = makeLoc(45.4971, -73.5785);
        expect(() => {
            renderHook(() => useStepNavigator(stepsEmptyPoly, onRoute));
        }).not.toThrow();
    });
});