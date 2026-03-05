import {
    fetchBuildingFloors,
    fetchFloorDetails,
    fetchSupportedIndoorBuildings,
    fetchNearestNode,
    normalizeIndoorBuildingCode,
} from '@/services/http/indoor-api';

jest.mock('@/services/http/campus-api', () => ({
    ...jest.requireActual('@/services/http/campus-api'),
    getApiBaseUrl: () => 'http://api.test',
}));

describe('indoor-api', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn() as jest.Mock;
    });

    it('normalizes indoor building code values', () => {
        expect(normalizeIndoorBuildingCode('h')).toBe('H');
        expect(normalizeIndoorBuildingCode('CC')).toBe('CC');
        expect(normalizeIndoorBuildingCode(' h ')).toBe('H');
        expect(normalizeIndoorBuildingCode('unknown')).toBe('UNKNOWN');
        expect(normalizeIndoorBuildingCode(null)).toBeNull();
    });

    it('fetchSupportedIndoorBuildings returns backend indoor source of truth payload', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                {campusId: 'loy', buildingCode: 'cc'},
                {campusId: 'sgw', buildingCode: 'h'},
            ]),
        });

        await expect(fetchSupportedIndoorBuildings()).resolves.toEqual([
            {campusId: 'LOY', buildingCode: 'CC'},
            {campusId: 'SGW', buildingCode: 'H'},
        ]);

        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/indoor/buildings',
            expect.any(Object),
        );
    });

    it('fetchBuildingFloors requests the right endpoint and sorts by sortOrder', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                {id: '2', label: '2nd', sortOrder: 2},
                {id: '1', label: '1st', sortOrder: 1},
            ]),
        });

        const result = await fetchBuildingFloors('SGW', 'H');

        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/campuses/SGW/buildings/H/floors',
            expect.any(Object),
        );
        expect(result.map((floor) => floor.id)).toEqual(['1', '2']);
    });

    it('fetchBuildingFloors URL-encodes campus and building values', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([]),
        });

        await fetchBuildingFloors('SGW WEST', 'H/1');

        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/campuses/SGW%20WEST/buildings/H%2F1/floors',
            expect.any(Object),
        );
    });

    it('fetchFloorDetails returns null for 404 and throws for other errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        await expect(fetchFloorDetails('SGW', 'H', '1')).resolves.toBeNull();

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        await expect(fetchFloorDetails('SGW', 'H', '1')).rejects.toThrow(
            'Indoor API request failed (500)',
        );
    });

    it('fetchFloorDetails returns parsed floor payload when successful', async () => {
        const payload = {
            buildingCode: 'H',
            floor: {id: '1', label: '1st Floor'},
            planGeometry: {type: 'Polygon', coordinates: []},
            rooms: {type: 'FeatureCollection', features: []},
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(payload),
        });

        await expect(fetchFloorDetails('SGW', 'H', 'S2')).resolves.toEqual(payload);
        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/campuses/SGW/buildings/H/floors/S2',
            expect.any(Object),
        );
    });

    it('fetchNearestNode returns the nearest node with correct coordinates', async () => {
        const longitude = -73.57866682112217;
        const latitude = 45.49716479345519;
        const nearestNodePayload = {
            id: 'H8.807',
            label: 'Room',
            wheelchairAccessible: true,
            floor: '8',
            building: 'H',
            longitude,
            latitude,
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(nearestNodePayload),
        });

        const result = await fetchNearestNode('H', '8', longitude, latitude);

        expect(result).toEqual(nearestNodePayload);
        expect(global.fetch).toHaveBeenCalledWith(
            `http://api.test/api/indoor-directions/building/H/floor/8/nearest-node?longitude=${longitude}&latitude=${latitude}`,
            expect.any(Object),
        );
    });

    it('fetchNearestNode throws user-friendly error for 404 responses', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 404,
        });

        await expect(fetchNearestNode('H', '1', -73.5788, 45.4972)).rejects.toThrow(
            'No nodes found on H floor 1 within 20 meters',
        );
    });
});

describe('campus-api', () => {
    function loadCampusApi(): typeof import('@/services/http/campus-api') {
        process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';
        jest.resetModules();
        let campusApi!: typeof import('@/services/http/campus-api');

        jest.isolateModules(() => {
            jest.unmock('@/services/http/campus-api');
            campusApi = require('@/services/http/campus-api');
        });

        return campusApi;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn() as jest.Mock;
    });

    afterEach(() => {
        delete process.env.EXPO_PUBLIC_API_BASE_URL;
    });

    it('fetchCampuses maps backend center objects to tuple coordinates', async () => {
        const {fetchCampuses} = loadCampusApi();

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                {
                    id: 'LOY',
                    label: 'Loyola',
                    name: 'Loyola Campus',
                    center: {lon: -73.6406, lat: 45.4583},
                    zoom: 16,
                },
            ]),
        });

        await expect(fetchCampuses()).resolves.toEqual([
            {
                id: 'LOY',
                label: 'Loyola',
                name: 'Loyola Campus',
                center: [-73.6406, 45.4583],
                zoom: 16,
            },
        ]);

        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/campuses',
            expect.any(Object),
        );
    });

    it('fetchBuildings maps backend buildings and defaults hasIndoorMap to false', async () => {
        const {fetchBuildings} = loadCampusApi();

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                {
                    campus: 'SGW',
                    code: 'H',
                    name: 'Hall Building',
                    location: {type: 'Polygon', coordinates: []},
                    addresses: ['1455 De Maisonneuve Blvd W'],
                    center: {lon: -73.5788, lat: 45.4972},
                },
                {
                    campus: 'LOY',
                    code: 'CC',
                    name: 'CC Building',
                    addresses: ['7141 Sherbrooke St W'],
                    center: {lon: -73.6406, lat: 45.4583},
                    hasIndoorMap: true,
                },
            ]),
        });

        await expect(fetchBuildings('SGW')).resolves.toEqual([
            {
                campus: 'SGW',
                code: 'H',
                name: 'Hall Building',
                location: {type: 'Polygon', coordinates: []},
                addresses: ['1455 De Maisonneuve Blvd W'],
                center: [-73.5788, 45.4972],
                hasIndoorMap: false,
            },
            {
                campus: 'LOY',
                code: 'CC',
                name: 'CC Building',
                addresses: ['7141 Sherbrooke St W'],
                center: [-73.6406, 45.4583],
                hasIndoorMap: true,
            },
        ]);

        expect(global.fetch).toHaveBeenCalledWith(
            'http://api.test/api/campuses/SGW/buildings',
            expect.any(Object),
        );
    });

    it('searchPlaceByAddress posts the address payload and returns the place id', async () => {
        const {searchPlaceByAddress} = loadCampusApi();

        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({placeId: 'place-123'}),
        });

        await expect(searchPlaceByAddress('1455 De Maisonneuve Blvd W')).resolves.toBe('place-123');

        expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/places/search', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address: '1455 De Maisonneuve Blvd W'}),
        });
    });

    it('fetchPlaceDetails returns the backend details payload', async () => {
        const {fetchPlaceDetails} = loadCampusApi();
        const details = {
            nationalPhoneNumber: '+1 514-000-0000',
            websiteUri: 'https://example.org',
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue(details),
        });

        await expect(fetchPlaceDetails('place-123')).resolves.toEqual(details);
        expect(global.fetch).toHaveBeenCalledWith('http://api.test/api/places/place-123');
    });
});
