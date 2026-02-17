import {Provider, TransportMode, type DirectionsRequest} from '@/services/maps/directions-api-adapter';

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

//mapbox response
const validMapboxPayload = {
    routes: [
        {
            distance: 100,
            duration: 60,
            geometry: 'encodedPoly',
            legs: [
                {
                    steps: [
                        {
                            distance: 100,
                            duration: 60,
                            geometry: 'stepPoly',
                            maneuver: {type: 'depart', instruction: 'Go'},
                            intersections: [{location: [-73.5787, 45.4972]}],
                        },
                    ],
                },
            ],
        },
    ],
};

//google maps response
const validGooglePayload = {
    routes: [
        {
            distanceMeters: 200,
            duration: '120s',
            polyline: {encodedPolyline: 'googlePoly'},
            legs: [
                {
                    steps: [
                        {
                            distanceMeters: 200,
                            staticDuration: '120s',
                            polyline: {encodedPolyline: 'googleStepPoly'},
                            startLocation: {latLng: {latitude: 45.4972, longitude: -73.5787}},
                            endLocation: {latLng: {latitude: 45.4583, longitude: -73.6406}},
                            navigationInstruction: {maneuver: 'DEPART', instructions: 'Go'},
                        },
                    ],
                },
            ],
            
        },
    ],
};

const originalFetch = global.fetch;

beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'test-mapbox-token';
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-key';
});

afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
});

//task 2.3.2
describe('getDirections mapbox request', () => {
    it('correctly calls the mapbox directions', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validMapboxPayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({transportMode: TransportMode.DRIVING}));

        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
        expect(calledUrl).toContain('api.mapbox.com/directions/v5/mapbox/driving/');
        expect(calledUrl).toContain(`${origin.longitude},${origin.latitude}`);
        expect(calledUrl).toContain(`${destination.longitude},${destination.latitude}`);
    });

    it('includes access_token, geometries, overview and steps params', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validMapboxPayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest());

        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
        expect(calledUrl).toContain('access_token=test-mapbox-token');
        expect(calledUrl).toContain('geometries=polyline');
        expect(calledUrl).toContain('overview=full');
        expect(calledUrl).toContain('steps=true');
    });
});

describe('getDirections google maps request', () => {
    it('POSTs to the google endpoint', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validGooglePayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({provider: Provider.GOOGLE_MAPS}));

        const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
        expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
        expect(options.method).toBe('POST');
    });

    it('sends origin, destination and travel mode in JSON body', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validGooglePayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({provider: Provider.GOOGLE_MAPS, transportMode: TransportMode.TRANSIT}),);

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.origin.location.latLng.latitude).toBe(origin.latitude);
        expect(body.origin.location.latLng.longitude).toBe(origin.longitude);
        expect(body.destination.location.latLng.latitude).toBe(destination.latitude);
        expect(body.destination.location.latLng.longitude).toBe(destination.longitude);
        expect(body.travelMode).toBe('TRANSIT');
    });

    it('includes required google api key', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validGooglePayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({provider: Provider.GOOGLE_MAPS}));

        const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
        expect(headers['X-Goog-Api-Key']).toBe('test-google-key');
        expect(headers['X-Goog-FieldMask']).toBe('routes.distanceMeters,routes.duration,routes.polyline,routes.legs.steps');
    });
});

//task 2.3.5
describe('getDirections error handling', () => {
    it('throws on mapbox non-ok response', async () => {
        global.fetch = jest.fn().mockResolvedValue({ok: false, status: 401});
        const {getDirections} = require('@/services/maps/directions-api-adapter');
        await expect(getDirections(makeRequest())).rejects.toThrow('Mapbox API error: 401');
    });

    it('throws on google maps non-ok response', async () => {
        global.fetch = jest.fn().mockResolvedValue({ok: false, status: 403});
        const {getDirections} = require('@/services/maps/directions-api-adapter');
        await expect(getDirections(makeRequest({provider: Provider.GOOGLE_MAPS}))).rejects.toThrow('Google Maps API error: 403');
    });

    it('throws on network failure', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
        const {getDirections} = require('@/services/maps/directions-api-adapter');
        await expect(getDirections(makeRequest())).rejects.toThrow('Network request failed');
    });
});

//provider routing
describe('getDirections provider routing', () => {
    it('routes to mapbox when provider is mapbox', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validMapboxPayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        const result = await getDirections(makeRequest({provider: Provider.MAPBOX}));
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
        expect(calledUrl).toContain('api.mapbox.com');
        expect(result.distanceMeters).toBe(100);
    });

    it('routes to google when provider is google maps', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => validGooglePayload,
        });
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        const result = await getDirections(makeRequest({provider: Provider.GOOGLE_MAPS}));
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
        expect(calledUrl).toContain('routes.googleapis.com');
        expect(result.distanceMeters).toBe(200);
    });
});

//task 2.3.1 - transport mode mapping
describe('mapbox transport mode mapping', () => {
    it.each([
        [TransportMode.WALKING, 'walking'],
        [TransportMode.DRIVING, 'driving'],
        [TransportMode.TRANSIT, 'walking'],
    ])('TransportMode maps to mapbox profile', async (mode, expectedProfile) => {
        global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => validMapboxPayload});
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({transportMode: mode, provider: Provider.MAPBOX}));
        const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(url).toContain(`/mapbox/${expectedProfile}/`);
    });
});

describe('google transport mode mapping', () => {
    it.each([
        [TransportMode.WALKING, 'WALK'],
        [TransportMode.DRIVING, 'DRIVE'],
        [TransportMode.TRANSIT, 'TRANSIT'],
    ]) ('TransportMode maps to google travel mode', async (mode, expectedMode) => {
        global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => validGooglePayload});
        const {getDirections} = require('@/services/maps/directions-api-adapter');

        await getDirections(makeRequest({transportMode: mode, provider: Provider.GOOGLE_MAPS}));
        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.travelMode).toBe(expectedMode);
    });
});
