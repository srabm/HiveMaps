import {convertMapboxResponse, type DirectionsResponse} from '@/services/maps/directions-api-adapter';

// ─── Fixture with modifiers ───────────────────────────────────────────────────
// Tests the maneuver/maneuverModifier split introduced when buildMapboxManeuver
// was moved out of the data layer and into the UI layer (step-by-step-panel).

const mapboxWithModifiers = {
    routes: [
        {
            duration: 180,
            distance: 300,
            geometry: 'routePoly',
            legs: [
                {
                    steps: [
                        {
                            duration: 10,
                            distance: 50,
                            geometry: 'p1',
                            maneuver: {
                                type: 'depart',
                                instruction: 'Head north',
                                // no modifier — standalone type
                            },
                            intersections: [
                                { location: [-73.578528, 45.497116] },
                            ],
                        },
                        {
                            duration: 20,
                            distance: 100,
                            geometry: 'p2',
                            maneuver: {
                                type: 'turn',
                                modifier: 'left',
                                instruction: 'Turn left onto Rue Sainte-Catherine',
                            },
                            intersections: [
                                { location: [-73.579000, 45.496500] },
                                { location: [-73.579100, 45.496400] },
                            ],
                        },
                        {
                            duration: 15,
                            distance: 80,
                            geometry: 'p3',
                            maneuver: {
                                type: 'turn',
                                modifier: 'slight right',
                                instruction: 'Bear right onto the path',
                            },
                            intersections: [
                                { location: [-73.579200, 45.496300] },
                            ],
                        },
                        {
                            duration: 30,
                            distance: 60,
                            geometry: 'p4',
                            maneuver: {
                                type: 'new name',
                                modifier: 'straight',
                                instruction: 'Continue onto Boulevard René-Lévesque',
                            },
                            intersections: [
                                { location: [-73.579500, 45.496000] },
                            ],
                        },
                        {
                            duration: 5,
                            distance: 10,
                            geometry: 'p5',
                            maneuver: {
                                type: 'roundabout',
                                modifier: 'right',
                                instruction: 'Enter the roundabout',
                            },
                            intersections: [
                                { location: [-73.579800, 45.495700] },
                            ],
                        },
                        {
                            duration: 0,
                            distance: 0,
                            geometry: 'p6',
                            maneuver: {
                                type: 'arrive',
                                instruction: 'You have arrived',
                                // no modifier — standalone type
                            },
                            intersections: [
                                { location: [-73.580000, 45.495500] },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

describe('convertMapboxResponse — maneuver and maneuverModifier fields', () => {
    let result: DirectionsResponse;

    beforeAll(() => {
        result = convertMapboxResponse(mapboxWithModifiers);
    });

    // ── Raw maneuver type is preserved as-is ──────────────────────────────

    it('preserves raw type "depart" without modification', () => {
        expect(result.steps[0].maneuver).toBe('depart');
    });

    it('preserves raw type "turn" without combining modifier', () => {
        expect(result.steps[1].maneuver).toBe('turn');
    });

    it('preserves raw type "new name"', () => {
        expect(result.steps[3].maneuver).toBe('new name');
    });

    it('preserves raw type "roundabout"', () => {
        expect(result.steps[4].maneuver).toBe('roundabout');
    });

    it('preserves raw type "arrive"', () => {
        expect(result.steps[5].maneuver).toBe('arrive');
    });

    // ── maneuverModifier carries the raw modifier string ──────────────────

    it('maneuverModifier is undefined when step has no modifier', () => {
        expect(result.steps[0].maneuverModifier).toBeUndefined();
    });

    it('maneuverModifier is "left" for turn-left step', () => {
        expect(result.steps[1].maneuverModifier).toBe('left');
    });

    it('maneuverModifier preserves original spacing ("slight right")', () => {
        expect(result.steps[2].maneuverModifier).toBe('slight right');
    });

    it('maneuverModifier is "straight" for new-name straight step', () => {
        expect(result.steps[3].maneuverModifier).toBe('straight');
    });

    it('maneuverModifier is "right" for roundabout-right step', () => {
        expect(result.steps[4].maneuverModifier).toBe('right');
    });

    it('maneuverModifier is undefined for arrive step', () => {
        expect(result.steps[5].maneuverModifier).toBeUndefined();
    });

    // ── maneuver does NOT contain a combined string (regression guard) ────

    it('does not combine type and modifier into "turn-left"', () => {
        expect(result.steps[1].maneuver).not.toBe('turn-left');
    });

    it('does not combine type and modifier into "turn-slight-right"', () => {
        expect(result.steps[2].maneuver).not.toBe('turn-slight-right');
    });

    it('does not produce "turn-right" fallback when modifier is present', () => {
        expect(result.steps[1].maneuver).not.toBe('turn-right');
    });

    // ── Other fields unaffected ───────────────────────────────────────────

    it('instruction is still mapped correctly', () => {
        expect(result.steps[1].instruction).toContain('Sainte-Catherine');
    });

    it('step count is correct', () => {
        expect(result.steps).toHaveLength(6);
    });
});

// ─── Original fixture (no modifiers) — regression guard ──────────────────────
// Ensures the original test scenario still works after the maneuverModifier change.

const originalFixture = {
    routes: [
        {
            duration: 287.621,
            distance: 404.684,
            geometry: 'fullRoutePoly',
            legs: [
                {
                    steps: [
                        {
                            duration: 33.101,
                            distance: 44.259,
                            geometry: 'step1Poly',
                            maneuver: {
                                type: 'depart',
                                instruction: 'Walk southwest on Boulevard De Maisonneuve Ouest',
                            },
                            intersections: [
                                { location: [-73.578528, 45.497116] },
                                { location: [-73.578610, 45.497034] },
                            ],
                        },
                        {
                            duration: 2.831,
                            distance: 4.02,
                            geometry: 'step2Poly',
                            maneuver: {
                                type: 'turn',
                                instruction: 'Bear left onto the walkway',
                                // no modifier provided
                            },
                            intersections: [
                                { location: [-73.578841, 45.496784] },
                            ],
                        },
                        {
                            duration: 0,
                            distance: 0,
                            geometry: 'step3Poly',
                            maneuver: {
                                type: 'arrive',
                                instruction: 'Your destination is on the left',
                            },
                            intersections: [
                                { location: [-73.578550, 45.494285] },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

describe('convertMapboxResponse — original fixture regression', () => {
    let result: DirectionsResponse;

    beforeAll(() => {
        result = convertMapboxResponse(originalFixture);
    });

    it('step[1].maneuver is "turn" (not "turn-right")', () => {
        expect(result.steps[1].maneuver).toBe('turn');
    });

    it('step[1].maneuverModifier is undefined when no modifier in fixture', () => {
        expect(result.steps[1].maneuverModifier).toBeUndefined();
    });

    it('step[0].maneuver is "depart"', () => {
        expect(result.steps[0].maneuver).toBe('depart');
    });

    it('step[2].maneuver is "arrive"', () => {
        expect(result.steps[2].maneuver).toBe('arrive');
    });
});
