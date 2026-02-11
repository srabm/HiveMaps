import {Provider, TransportMode, type DirectionsRequest} from '../directions-api-adapter';

const origin = {latitude: 45.4972, longitude: -73.5787};
const destination = {latitude: 45.4583, longitude: -73.6406};

function makeRequest(overrides: Partial<DirectionsRequest> = {}): DirectionsRequest {
    return {
        origin,
        destination,
        transportMode: TransportMode.WALKING,
        provider: Provider.MAPBOX,
        ...overrides,
    };
}

const validMapboxPayload = {
    routes: [{
        distanceMeters: 1, duration: 1, geometry: 'p',
        legs: [{steps: [{distance: 1, duration: 1, geometry: 'p', maneuver: {type: 'd', instructions: 'g'}, intersections: [{location: [0, 0]}]}]}],
    }],
};

const validGooglePayload = {
    routes: [{
        distanceMeters: 1, duration: '1s', polyline: {encodedPolyline: 'p'}, 
        legs: [{steps: [{distanceMeters: 1, staticDuration: '1s', polyline: {encodedPolyline: 'p'}, startLocation: {latLng: {latitude: 0, longitude: 0}}, endLocation: {latLng: {latitude: 0, longitude: 0}}, navigationInstruction: {maneuver: 'D', instructions: 'g'}}]}],
    }],
};

const originalFetch = global.fetch;

beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'tok';
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'gkey';
});

afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
});

describe('mapbox transport mode', () => {
    it.each([
        [TransportMode.WALKING, 'walking'],
        [TransportMode.DRIVING, 'driving'],
        [TransportMode.BIKING, 'cycling'],
        [TransportMode.TRANSIT, 'walking'],
    ])('TransportMode maps to mapbox profile', async (mode, expectedProfile) => {
        global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => validMapboxPayload});
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({transportMode: mode, provider: Provider.MAPBOX}));
        const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(url).toContain(`/mapbox/${expectedProfile}/`);
    });
});

describe('google transport mode', () => {
    it.each([
        [TransportMode.WALKING, 'WALK'],
        [TransportMode.DRIVING, 'DRIVE'],
        [TransportMode.BIKING, 'BICYCLE'],
        [TransportMode.TRANSIT, 'TRANSIT'],
    ]) ('TransportMode maps to google travel mode', async (mode, expectedMode) => {
        global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => validGooglePayload});
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({transportMode: mode, provider: Provider.GOOGLE_MAPS}));
        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.travelMode).toBe(expectedMode);
    });
});
