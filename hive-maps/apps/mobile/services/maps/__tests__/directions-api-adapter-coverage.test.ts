/**
 * directions-api-adapter — full coverage tests
 */

import {
    getDirections,
    clearDirectionsCache,
    initializeDirectionsCache,
    addDirectionsListener,
    convertGoogleMapsResponse,
    TransportMode,
    Provider,
    type DirectionsRequest,
    type DirectionsRequestEvent,
} from '@/services/maps/directions-api-adapter';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SGW = { latitude: 45.4971, longitude: -73.5785 };
const LOY = { latitude: 45.4583, longitude: -73.6406 };
// A clearly different destination — avoids any coordinate normalisation collision
const DOWNTOWN = { latitude: 45.510, longitude: -73.560 };

const BASE_MAPBOX_REQUEST: DirectionsRequest = {
    origin: SGW,
    destination: LOY,
    transportMode: TransportMode.WALKING,
    provider: Provider.MAPBOX,
    timeFilter: '2026-03-06T05:00:00Z',
    timeFilterMode: 'depart',
};

const DRIVING_MAPBOX_REQUEST: DirectionsRequest = {
    ...BASE_MAPBOX_REQUEST,
    transportMode: TransportMode.DRIVING,
};

const TRANSIT_GOOGLE_REQUEST: DirectionsRequest = {
    origin: SGW,
    destination: LOY,
    transportMode: TransportMode.TRANSIT,
    provider: Provider.GOOGLE_MAPS,
    timeFilter: '2026-03-06T05:00:00Z',
    timeFilterMode: 'depart',
};

// A walking request to a different destination — distinct cache key from BASE_MAPBOX_REQUEST
const DIFFERENT_DEST_REQUEST: DirectionsRequest = {
    ...BASE_MAPBOX_REQUEST,
    destination: DOWNTOWN,
};

function mapboxApiResponse() {
    return {
        routes: [{
            duration: 600,
            distance: 800,
            geometry: 'encodedPoly',
            legs: [{
                steps: [{
                    duration: 600,
                    distance: 800,
                    geometry: 'stepPoly',
                    maneuver: { type: 'depart', instruction: 'Head north' },
                    intersections: [{ location: [-73.5785, 45.4971] }],
                }],
            }],
        }],
    };
}

function googleApiResponse() {
    return {
        routes: [{
            distanceMeters: 800,
            duration: '600s',
            polyline: { encodedPolyline: 'googlePoly' },
            legs: [{
                steps: [{
                    distanceMeters: 800,
                    staticDuration: '600s',
                    navigationInstruction: { instructions: 'Walk north', maneuver: 'DEPART' },
                    startLocation: { latLng: { latitude: 45.4971, longitude: -73.5785 } },
                    endLocation:   { latLng: { latitude: 45.4583, longitude: -73.6406 } },
                    polyline: { encodedPolyline: 'stepPoly' },
                }],
            }],
        }],
    };
}

function okJson(body: object) {
    return { ok: true, json: jest.fn().mockResolvedValue(body), status: 200 };
}

function errorResponse(status: number) {
    return { ok: false, json: jest.fn().mockResolvedValue({ message: 'error' }), status };
}

// Clear cache + mocks before every test so module-level state doesn't leak
beforeEach(async () => {
    jest.clearAllMocks();
    await clearDirectionsCache();
});

// ─── convertGoogleMapsResponse ────────────────────────────────────────────────

describe('convertGoogleMapsResponse', () => {
    it('maps distanceMeters and duration', () => {
        const result = convertGoogleMapsResponse(googleApiResponse());
        expect(result.distanceMeters).toBe(800);
        expect(result.durationSeconds).toBe(600);
    });

    it('maps route polyline', () => {
        const result = convertGoogleMapsResponse(googleApiResponse());
        expect(result.polyline).toBe('googlePoly');
    });

    it('maps step instruction and maneuver', () => {
        const result = convertGoogleMapsResponse(googleApiResponse());
        expect(result.steps[0].instruction).toBe('Walk north');
        expect(result.steps[0].maneuver).toBe('DEPART');
    });

    it('maps step start and end locations', () => {
        const result = convertGoogleMapsResponse(googleApiResponse());
        expect(result.steps[0].startLocation.latitude).toBeCloseTo(45.4971);
        expect(result.steps[0].endLocation.longitude).toBeCloseTo(-73.6406);
    });

    it('handles missing distanceMeters — falls back to 0', () => {
        const data = googleApiResponse();
        delete (data.routes[0] as any).distanceMeters;
        const result = convertGoogleMapsResponse(data);
        expect(result.distanceMeters).toBe(0);
    });

    it('handles duration as a plain number', () => {
        const data = googleApiResponse();
        (data.routes[0] as any).duration = 300;
        const result = convertGoogleMapsResponse(data);
        expect(result.durationSeconds).toBe(300);
    });

    it('handles duration "0s"', () => {
        const data = googleApiResponse();
        (data.routes[0] as any).duration = '0s';
        const result = convertGoogleMapsResponse(data);
        expect(result.durationSeconds).toBe(0);
    });

    it('handles missing navigationInstruction gracefully', () => {
        const data = googleApiResponse();
        delete (data.routes[0].legs[0].steps[0] as any).navigationInstruction;
        const result = convertGoogleMapsResponse(data);
        expect(result.steps[0].instruction).toBe('');
        expect(result.steps[0].maneuver).toBe('');
    });

    it('maps transit step details', () => {
        const data = googleApiResponse();
        (data.routes[0].legs[0].steps[0] as any).transitDetails = {
            stopDetails: {
                departureStop: { name: "Lucien-L'Allier" },
                arrivalStop:   { name: 'Côte-Sainte-Catherine' },
                departureTime: { time: '2026-03-06T05:10:00-05:00' },
                arrivalTime:   { time: '2026-03-06T05:25:00-05:00' },
            },
            transitLine: { name: 'Green Line', nameShort: '2', color: '#00853F' },
        };
        const result = convertGoogleMapsResponse(data);
        const td = result.steps[0].transitDetails;
        expect(td).toBeDefined();
        expect(td.transitLine.nameShort).toBe('2');
        expect(td.stopDetails.departureStop.name).toBe("Lucien-L'Allier");
    });

    it('normalizes transit headsign and shortName fields from Google transit details', () => {
        const data = googleApiResponse();
        (data.routes[0].legs[0].steps[0] as any).transitDetails = {
            headsign: 'Nord',
            stopDetails: {
                departureStop: { name: 'Guy' },
                arrivalStop: { name: 'Mont-Royal' },
            },
            transitLine: {
                name: 'Sherbrooke',
                shortName: '24',
                color: '#16a34a',
            },
        };

        const result = convertGoogleMapsResponse(data);
        const td = result.steps[0].transitDetails;

        expect(td.headsign).toBe('Nord');
        expect(td.transitLine.nameShort).toBe('24');
    });

    it('leaves transitDetails undefined for non-transit steps', () => {
        const result = convertGoogleMapsResponse(googleApiResponse());
        expect(result.steps[0].transitDetails).toBeUndefined();
    });

    it('throws when routes array is empty', () => {
        expect(() => convertGoogleMapsResponse({ routes: [] })).toThrow();
    });
});

// ─── parseGoogleDuration edge cases ───────────────────────────────────────────

describe('parseGoogleDuration — edge cases via convertGoogleMapsResponse', () => {
    function withDuration(dur: unknown) {
        const data = googleApiResponse();
        (data.routes[0] as any).duration = dur;
        return convertGoogleMapsResponse(data).durationSeconds;
    }

    it('handles null duration — returns 0', () => expect(withDuration(null)).toBe(0));
    it('handles undefined duration — returns 0', () => expect(withDuration(undefined)).toBe(0));
    it('handles non-numeric string — returns 0', () => expect(withDuration('NaN')).toBe(0));
    it('handles "1543s" string correctly', () => expect(withDuration('1543s')).toBe(1543));
});

// ─── getDirections — cache ────────────────────────────────────────────────────

describe('getDirections — cache hit', () => {
    it('returns cached response without fetching a second time', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);
        await getDirections(BASE_MAPBOX_REQUEST);

        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns identical object reference from cache', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        const first  = await getDirections(BASE_MAPBOX_REQUEST);
        const second = await getDirections(BASE_MAPBOX_REQUEST);
        expect(first).toBe(second);
    });

    it('treats requests with different destinations as distinct cache keys', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(mapboxApiResponse()))
            .mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);
        await getDirections(DIFFERENT_DEST_REQUEST);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('treats requests with different transport modes as distinct cache keys', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(mapboxApiResponse()))
            .mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);       // walking
        await getDirections(DRIVING_MAPBOX_REQUEST);    // driving

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('non-transit cache ignores timeFilter — same key for different times', async () => {
        // For walking/driving, timeFilter is NOT part of the cache key by design
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);
        await getDirections({ ...BASE_MAPBOX_REQUEST, timeFilter: '2026-03-06T09:00:00Z' });

        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

describe('getDirections — clearDirectionsCache', () => {
    it('forces a fresh fetch after clearing the cache', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(mapboxApiResponse()))
            .mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);
        await clearDirectionsCache();
        await getDirections(BASE_MAPBOX_REQUEST);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// ─── getDirections — transit fuzzy cache ─────────────────────────────────────

describe('getDirections — transit fuzzy cache', () => {
    it('reuses a cached transit route within 5 minutes', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));

        const first = await getDirections(TRANSIT_GOOGLE_REQUEST);
        const second = await getDirections({
            ...TRANSIT_GOOGLE_REQUEST,
            timeFilter: '2026-03-06T05:03:00Z', // 3 min later
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
    });

    it('does NOT reuse a cached transit route older than 5 minutes', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(googleApiResponse()))
            .mockResolvedValueOnce(okJson(googleApiResponse()));

        await getDirections(TRANSIT_GOOGLE_REQUEST);
        await getDirections({
            ...TRANSIT_GOOGLE_REQUEST,
            timeFilter: '2026-03-06T05:10:00Z', // 10 min later
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// ─── getDirections — event listeners ─────────────────────────────────────────

describe('getDirections — event listeners', () => {
    it('emits request-started and request-success on happy path', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        const events: DirectionsRequestEvent[] = [];
        const unsub = addDirectionsListener((e) => events.push(e));
        await getDirections(BASE_MAPBOX_REQUEST);
        unsub();

        expect(events.map((e) => e.type)).toEqual(['request-started', 'request-success']);
    });

    it('emits request-failed on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('network failure'));

        const events: DirectionsRequestEvent[] = [];
        const unsub = addDirectionsListener((e) => events.push(e));

        // Use a unique destination to guarantee no cache hit
        await expect(getDirections(DIFFERENT_DEST_REQUEST)).rejects.toThrow('network failure');
        unsub();

        expect(events.map((e) => e.type)).toContain('request-failed');
    });

    it('emits request-timeout when fetchWithTimeout throws DirectionsRequestTimeout', async () => {
        // Simulate what fetchWithTimeout does internally on AbortError
        const timeoutError = Object.assign(new Error('DirectionsRequestTimeout'), { name: 'AbortError' });
        // fetchWithTimeout catches AbortError and re-throws as DirectionsRequestTimeout message
        // We mock at the fetch level to reproduce the abort path through fetchWithTimeout
        mockFetch.mockImplementationOnce(() => {
            const err = new Error('');
            err.name = 'AbortError';
            return Promise.reject(err);
        });

        const events: DirectionsRequestEvent[] = [];
        const unsub = addDirectionsListener((e) => events.push(e));

        await expect(getDirections(DIFFERENT_DEST_REQUEST)).rejects.toThrow();
        unsub();

        expect(events.map((e) => e.type)).toContain('request-timeout');
    });

    it('unsubscribe stops receiving events', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        const events: DirectionsRequestEvent[] = [];
        const unsub = addDirectionsListener((e) => events.push(e));
        unsub();

        await getDirections(BASE_MAPBOX_REQUEST);
        expect(events).toHaveLength(0);
    });

    it('does not emit events for cache hits', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST); // populate cache

        const events: DirectionsRequestEvent[] = [];
        const unsub = addDirectionsListener((e) => events.push(e));
        await getDirections(BASE_MAPBOX_REQUEST); // cache hit
        unsub();

        expect(events).toHaveLength(0);
    });
});

// ─── getDirections — Mapbox provider ─────────────────────────────────────────

describe('getDirections — Mapbox provider', () => {
    it('calls Mapbox API with walking profile for WALKING mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections(BASE_MAPBOX_REQUEST);
        expect(mockFetch.mock.calls[0][0]).toContain('/mapbox/walking/');
    });

    it('calls Mapbox API with driving profile for DRIVING mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections(DRIVING_MAPBOX_REQUEST);
        expect(mockFetch.mock.calls[0][0]).toContain('/mapbox/driving/');
    });

    it('includes depart_at for driving with depart timeFilterMode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections(DRIVING_MAPBOX_REQUEST);
        expect(mockFetch.mock.calls[0][0]).toContain('depart_at=');
    });

    it('includes arrive_by for driving with arrive timeFilterMode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections({ ...DRIVING_MAPBOX_REQUEST, timeFilterMode: 'arrive' });
        expect(mockFetch.mock.calls[0][0]).toContain('arrive_by=');
    });

    it('does NOT include depart_at for walking mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections(BASE_MAPBOX_REQUEST);
        expect(mockFetch.mock.calls[0][0]).not.toContain('depart_at=');
    });

    it('uses walking profile for TRANSIT mode (Mapbox fallback)', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections({ ...BASE_MAPBOX_REQUEST, transportMode: TransportMode.TRANSIT });
        expect(mockFetch.mock.calls[0][0]).toContain('/mapbox/walking/');
    });

    it('throws on non-ok Mapbox response', async () => {
        // Use a distinct destination to avoid hitting the walking cache from earlier tests
        mockFetch.mockResolvedValueOnce(errorResponse(401));
        await expect(
            getDirections({ ...BASE_MAPBOX_REQUEST, destination: { latitude: 45.520, longitude: -73.570 } })
        ).rejects.toThrow('Mapbox API error: 401');
    });

    it('strips milliseconds from timeFilter for Mapbox URL', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections({ ...DRIVING_MAPBOX_REQUEST, timeFilter: '2026-03-06T05:00:00.000Z' });
        expect(mockFetch.mock.calls[0][0]).not.toContain('.000Z');
    });
});

// ─── getDirections — Google provider ─────────────────────────────────────────

describe('getDirections — Google provider', () => {
    it('calls Google Routes API with POST', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections(TRANSIT_GOOGLE_REQUEST);
        expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });

    it('sends TRANSIT travelMode for transit request', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections(TRANSIT_GOOGLE_REQUEST);
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.travelMode).toBe('TRANSIT');
    });

    it('sends DRIVE travelMode for driving request', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections({ ...TRANSIT_GOOGLE_REQUEST, transportMode: TransportMode.DRIVING });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.travelMode).toBe('DRIVE');
    });

    it('sends WALK travelMode for walking request', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections({ ...TRANSIT_GOOGLE_REQUEST, transportMode: TransportMode.WALKING });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.travelMode).toBe('WALK');
    });

    it('includes departureTime for transit depart request', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections(TRANSIT_GOOGLE_REQUEST);
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.departureTime).toBe('2026-03-06T05:00:00Z');
    });

    it('includes arrivalTime for transit arrive request', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections({ ...TRANSIT_GOOGLE_REQUEST, timeFilterMode: 'arrive' });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.arrivalTime).toBe('2026-03-06T05:00:00Z');
    });

    it('does NOT include time fields for walking mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections({ ...TRANSIT_GOOGLE_REQUEST, transportMode: TransportMode.WALKING });
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.departureTime).toBeUndefined();
        expect(body.arrivalTime).toBeUndefined();
    });

    it('throws on non-ok Google response', async () => {
        mockFetch.mockResolvedValueOnce(errorResponse(403));
        await expect(
            getDirections({ ...TRANSIT_GOOGLE_REQUEST, timeFilter: '2026-03-06T06:00:00Z' })
        ).rejects.toThrow('Google Maps API error: 403');
    });

    it('sets correct field mask header', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections({ ...TRANSIT_GOOGLE_REQUEST, timeFilter: '2026-03-06T07:00:00Z' });
        const headers = mockFetch.mock.calls[0][1].headers;
        expect(headers['X-Goog-FieldMask']).toContain('routes.distanceMeters');
    });
});

// ─── initializeDirectionsCache ────────────────────────────────────────────────

describe('initializeDirectionsCache', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    it('handles corrupt AsyncStorage data gracefully', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce('{ not valid json }}}');
        await expect(initializeDirectionsCache()).resolves.not.toThrow();
    });

    it('handles AsyncStorage.getItem rejection gracefully', async () => {
        AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage failure'));
        await expect(initializeDirectionsCache()).resolves.not.toThrow();
    });

    it('does not throw when storage returns null', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);
        await expect(initializeDirectionsCache()).resolves.not.toThrow();
    });
});

// ─── persistCache error path (lines 88–95) ───────────────────────────────────

describe('persistCache — AsyncStorage.setItem failure', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    it('swallows setItem errors silently — getDirections still returns', async () => {
        AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        // Should resolve despite persist failure
        await expect(getDirections(BASE_MAPBOX_REQUEST)).resolves.toBeDefined();
    });
});

// ─── clearDirectionsCache error path (line 75) ───────────────────────────────

describe('clearDirectionsCache — AsyncStorage.removeItem failure', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    it('swallows removeItem errors silently', async () => {
        AsyncStorage.removeItem.mockRejectedValueOnce(new Error('storage locked'));
        await expect(clearDirectionsCache()).resolves.not.toThrow();
    });
});

describe('initializeDirectionsCache — loads valid storage data (L88-94)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adapter: any;
    let AsyncStorageMock: any;

    beforeAll(() => {
        jest.resetModules();
        AsyncStorageMock = require('@react-native-async-storage/async-storage');
        adapter = require('@/services/maps/directions-api-adapter');
    });

    afterAll(() => {
        // Restore the module registry so subsequent describe blocks use the
        // top-level imports again.
        jest.resetModules();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await adapter.clearDirectionsCache();
    });

    it('pre-warms in-memory cache so a subsequent getDirections needs no fetch', async () => {
        // ── Step 1: do one real fetch to let the adapter write the cache key
        //            into AsyncStorage via persistCache (setItem).
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await adapter.getDirections({
            origin:         { latitude: 45.4971, longitude: -73.5785 },
            destination:    { latitude: 45.4583, longitude: -73.6406 },
            transportMode:  adapter.TransportMode.WALKING,
            provider:       adapter.Provider.MAPBOX,
            timeFilter:     '2026-03-06T08:00:00Z',
            timeFilterMode: 'depart',
        });

        // ── Step 2: capture the exact key the module used
        const [, serialised] = AsyncStorageMock.setItem.mock.calls[0];
        const storedMap = JSON.parse(serialised) as Record<string, unknown>;
        const [derivedKey] = Object.keys(storedMap);

        const storedResponse = {
            distanceMeters: 500,
            durationSeconds: 120,
            polyline: 'cachedPoly',
            steps: [],
        };

        // ── Step 3: clear the in-memory cache and reset the cacheInitialized
        //            flag by re-requiring the module (resetModules in beforeAll
        //            already gave us an isolated instance, so clearDirectionsCache
        //            only clears the Map; we need to re-require to reset the flag).
        jest.resetModules();
        AsyncStorageMock = require('@react-native-async-storage/async-storage');
        adapter = require('@/services/maps/directions-api-adapter');
        jest.clearAllMocks();

        // ── Step 4: seed AsyncStorage with the fixture under the derived key
        AsyncStorageMock.getItem.mockResolvedValueOnce(
            JSON.stringify({ [derivedKey]: storedResponse })
        );
        await adapter.initializeDirectionsCache();

        // ── Step 5: getDirections should hit the pre-warmed cache — no fetch
        const result = await adapter.getDirections({
            origin:         { latitude: 45.4971, longitude: -73.5785 },
            destination:    { latitude: 45.4583, longitude: -73.6406 },
            transportMode:  adapter.TransportMode.WALKING,
            provider:       adapter.Provider.MAPBOX,
            timeFilter:     '2026-03-06T08:00:00Z',
            timeFilterMode: 'depart',
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.distanceMeters).toBe(500);
        expect(result.polyline).toBe('cachedPoly');
    });
});

// ─── L146 — isCacheRelevant non-transit: exact key comparison ────────────────

describe('isCacheRelevant — non-transit exact key check (L146)', () => {
    it('mismatched transport mode produces a cache miss', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(mapboxApiResponse()))
            .mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections(BASE_MAPBOX_REQUEST);
        await getDirections(DRIVING_MAPBOX_REQUEST);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// ─── L155 — isCacheRelevant transit: base-segment mismatch ───────────────────

describe('isCacheRelevant — transit base-key mismatch (L155)', () => {
    it('does not reuse transit cache when destination differs', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(googleApiResponse()))
            .mockResolvedValueOnce(okJson(googleApiResponse()));

        await getDirections(TRANSIT_GOOGLE_REQUEST);
        await getDirections({
            ...TRANSIT_GOOGLE_REQUEST,
            destination: { latitude: 45.510, longitude: -73.560 },
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not reuse transit cache when timeFilterMode changes depart → arrive', async () => {
        mockFetch
            .mockResolvedValueOnce(okJson(googleApiResponse()))
            .mockResolvedValueOnce(okJson(googleApiResponse()));

        await getDirections(TRANSIT_GOOGLE_REQUEST);
        await getDirections({
            ...TRANSIT_GOOGLE_REQUEST,
            timeFilterMode: 'arrive',
            timeFilter: '2026-03-06T05:01:00Z',
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// ─── L167 — isCacheRelevant transit: catch block on invalid date ──────────────

describe('isCacheRelevant — invalid cached date falls back to false (L167)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let freshAdapter: any;
    let freshAsyncStorage: any;

    beforeAll(() => {
        jest.resetModules();
        freshAsyncStorage = require('@react-native-async-storage/async-storage');
        freshAdapter = require('@/services/maps/directions-api-adapter');
    });

    afterAll(() => {
        jest.resetModules();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await freshAdapter.clearDirectionsCache();
    });

    it('treats a transit entry with an unparseable timestamp as irrelevant', async () => {
        // ── Step 1: real fetch to derive the transit cache key format
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await freshAdapter.getDirections({
            origin:         { latitude: 45.4971, longitude: -73.5785 },
            destination:    { latitude: 45.4583, longitude: -73.6406 },
            transportMode:  freshAdapter.TransportMode.TRANSIT,
            provider:       freshAdapter.Provider.GOOGLE_MAPS,
            timeFilter:     '2026-03-06T08:00:00Z',
            timeFilterMode: 'depart',
        });

        const [, serialised] = freshAsyncStorage.setItem.mock.calls[0];
        const [realKey] = Object.keys(JSON.parse(serialised));

        // ── Step 2: corrupt the timestamp segment and re-require for fresh flag
        const parts = realKey.split('|');
        parts[4] = 'NOT_A_DATE';
        const badKey = parts.join('|');

        jest.resetModules();
        freshAsyncStorage = require('@react-native-async-storage/async-storage');
        freshAdapter = require('@/services/maps/directions-api-adapter');
        jest.clearAllMocks();

        freshAsyncStorage.getItem.mockResolvedValueOnce(
            JSON.stringify({ [badKey]: { distanceMeters: 999, durationSeconds: 1, polyline: 'bad', steps: [] } })
        );
        await freshAdapter.initializeDirectionsCache();

        // ── Step 3: a fresh transit request must NOT be served from the bad entry
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await freshAdapter.getDirections({
            origin:         { latitude: 45.4971, longitude: -73.5785 },
            destination:    { latitude: 45.4583, longitude: -73.6406 },
            transportMode:  freshAdapter.TransportMode.TRANSIT,
            provider:       freshAdapter.Provider.GOOGLE_MAPS,
            timeFilter:     '2026-03-06T08:00:00Z',
            timeFilterMode: 'depart',
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

// ─── L176 — findRelevantTransitCache: non-transit early-return null ───────────

describe('findRelevantTransitCache — non-transit returns null immediately (L176)', () => {
    it('does not serve a walking request from a transit cache entry', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));
        await getDirections(TRANSIT_GOOGLE_REQUEST);

        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));
        await getDirections(BASE_MAPBOX_REQUEST);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

// ─── L350 — getMapboxProfile default branch ───────────────────────────────────

describe('getMapboxProfile — default branch (L350)', () => {
    it('falls back to the walking profile for an unrecognised transport mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(mapboxApiResponse()));

        await getDirections({
            ...BASE_MAPBOX_REQUEST,
            transportMode: 999 as TransportMode,
            destination: { latitude: 45.530, longitude: -73.530 },
        });

        expect(mockFetch.mock.calls[0][0]).toContain('/mapbox/walking/');
    });
});

// ─── L364 — getGoogleTravelMode default branch ───────────────────────────────

describe('getGoogleTravelMode — default branch (L364)', () => {
    it('falls back to WALK travel mode for an unrecognised transport mode', async () => {
        mockFetch.mockResolvedValueOnce(okJson(googleApiResponse()));

        await getDirections({
            ...TRANSIT_GOOGLE_REQUEST,
            transportMode: 999 as TransportMode,
            destination: { latitude: 45.531, longitude: -73.531 },
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.travelMode).toBe('WALK');
    });
});
