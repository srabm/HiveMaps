import {convertMapboxResponse, type DirectionsResponse} from '@/services/maps/directions-api-adapter';

//small mapbox api route SGW
const mapboxFixture = {
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
                                {location: [-73.578528, 45.497116]},
                                {location: [-73.578610, 45.497034]},
                            ],
                        },
                        {
                            duration: 2.831,
                            distance: 4.02,
                            geometry: 'step2Poly',
                            maneuver: {
                                type: 'turn',
                                instruction: 'Bear left onto the walkway',
                            },
                            intersections: [
                                {location: [-73.578841, 45.496784]},
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
                                {location: [-73.578550, 45.494285]},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

describe('convertMapboxResponse', () => {
    let result: DirectionsResponse;

    beforeAll(() => {
        result = convertMapboxResponse(mapboxFixture);
    });

    //task 2.3.4
    it('extracts route distance in meters', () => {
        expect(result.distanceMeters).toBe(405);
    });
    it('rextracts route duration in seconds', () => {
        expect(result.durationSeconds).toBe(288);
    });

    //task 2.3.3
    it('extracts the encoded polyline from the route geometry', () => {
        expect(result.polyline).toBe('fullRoutePoly');
    });

    it('maps all steps', () => {
        expect(result.steps).toHaveLength(3);
    });
    it('maps step distance', () => {
        expect(result.steps[0].distance).toBe(44.259);
    });
    it('maps step duration', () => {
        expect(result.steps[0].duration).toBe(33);
    });
    it('maps maneuver instructions', () => {
        expect(result.steps[0].instruction).toContain('Walk southwest');
    });
    it('maps maneuver type', () => {
        expect(result.steps[0].maneuver).toBe('depart');
        expect(result.steps[1].maneuver).toBe('turn');
        expect(result.steps[2].maneuver).toBe('arrive');
    });
    it('maps start and end locations', () => {
        const step = result.steps[0];
        expect(step.startLocation.longitude).toBeCloseTo(-73.578528, 5);
        expect(step.startLocation.latitude).toBeCloseTo(45.497116, 5);
        expect(step.endLocation.longitude).toBeCloseTo(-73.578610, 5);
        expect(step.endLocation.latitude).toBeCloseTo(45.497034, 5);
    });
    it('maps intersections', () => {
        const step = result.steps[1];
        expect(step.startLocation.longitude).toBe(step.endLocation.longitude);
        expect(step.startLocation.latitude).toBe(step.endLocation.latitude);
    });
    it('includes step-by-step polyline', () => {
        expect(result.steps[0].polyline).toBe('step1Poly');
    });

    //edge cases
    it('throws when route array is empty', () => {
        expect(() => convertMapboxResponse({routes: []})).toThrow();
    });
    it('throws when response has no route key', () => {
        expect(() => convertMapboxResponse({})).toThrow();
    });
});
