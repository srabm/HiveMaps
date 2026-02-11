import {convertGoogleMapsResponse, type DirectionsResponse} from '@/services/maps/directions-api-adapter';

//small google api route SGW
const googleFixture = {
    routes: [
        {
            legs: [
                {
                    steps: [
                        {
                            distanceMeters: 169,
                            staticDuration: '141s',
                            polyline: {encodedPolyline: 'step1Poly'},
                            startLocation: {latLng: {latitude: 45.4971071, longitude: -73.5784385}},
                            endLocation: {latLng: {latitude: 45.4958434, longitude: -73.5794044}},
                            navigationInstruction: {
                                maneuver: 'DEPART',
                                instructions: 'Head southwest on Blvd. De Maisonneuve Ouest toward Rue Mackay',
                            },
                        },
                        {
                            distanceMeters: 137,
                            staticDuration: '116', 
                            polyline: {encodedPolyline: 'step2Poly'},
                            startLocation: {latLng: {latitude: 45.4958434, longitude: -73.5794044}},
                            endLocation: {latLng: {latitude: 45.495086, longitude: -73.5777267}},
                            navigationInstruction: {
                                maneuver: 'TURN_LEFT',
                                instructions: 'Turn left onto Rue Guy',
                            },
                        },
                        {
                            distanceMeters: 101,
                            staticDuration: '102s',
                            polyline: {encodedPolyline: 'step3Poly'},
                            startLocation: {latLng: {latitude: 45.495086, longitude: -73.5777267}},
                            endLocation: {latLng: {latitude: 45.4943138, longitude: -73.5785979}},
                            navigationInstruction: {
                                maneuver: 'TURN_RIGHT',
                                instructions: 'Turn right onto Rue Sainte-Catherine Ouest',
                            },
                        },
                    ],   
                },
            ],
            distanceMeters: 407,
            duration: '358s',
            polyline: {encodedPolyline: 'fullRoutePoly',
            },
        },
    ],
};

describe('convertGoogleMapsResponse', () => {
    let result: DirectionsResponse;

    beforeAll(() => {
        result = convertGoogleMapsResponse(googleFixture);
    });

    //task 2.3.4
    it('extracts route distance in meters', () => {
        expect(result.distanceMeters).toBe(407);
    });
    it('extracts route duration in seconds', () => {
        expect(result.durationSeconds).toBe(358);
    });

    //task 2.3.3
    it('extacts the encoded polyline from the route', () => {
        expect(result.polyline).toBe('fullRoutePoly');
    });

    it('maps all steps', () => {
        expect(result.steps).toHaveLength(3)
    });
    it('maps step distance', () => {
        expect(result.steps[0].distance).toBe(169);
    });
    it('parses step duration from string to number', () => {
        expect(result.steps[0].duration).toBe(141);
    });
    it('maps navigation instructions', () => {
        expect(result.steps[0].instruction).toBe('Head southwest on Blvd. De Maisonneuve Ouest toward Rue Mackay');
    });
    it('maps maneuer type', () => {
        expect(result.steps[0].maneuver).toBe('DEPART');
        expect(result.steps[1].maneuver).toBe('TURN_LEFT');
    });
    it('maps start and end locations', () => {
        const step = result.steps[0];
        expect(step.startLocation.latitude).toBeCloseTo(45.4971071, 5);
        expect(step.startLocation.longitude).toBeCloseTo(-73.5784385, 5);
        expect(step.endLocation.latitude).toBeCloseTo(45.4958434, 5);
        expect(step.endLocation.longitude).toBeCloseTo(-73.5794044, 5);
    });
    it('includes step-by-step polyline', () => {
        expect(result.steps[0].polyline).toBe('step1Poly');
    });

    //edge cases
    it('throws when routes array is empty', () => {
        expect(() => convertGoogleMapsResponse({routes: []})).toThrow();
    });
    it('throws when response has no route key', () => {
        expect(() => convertGoogleMapsResponse({})).toThrow();
    });
});
