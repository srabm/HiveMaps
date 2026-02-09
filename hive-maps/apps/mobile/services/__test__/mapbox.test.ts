import { mapboxMapsAdapter } from '../mapbox';

jest.mock('@rnmapbox/maps', () => ({
    setAccessToken: jest.fn(),
    setTelemetryEnabled: jest.fn(),
    StyleURL: {
        Street: 'mock-style',
    },
}));


jest.mock('expo-constants', () => ({
    expoConfig: {
        extra: {
            mapboxAccessToken: 'test-token',
        },
    },
}));

describe('mapboxMapsAdapter.reverse', () => { // Testing the reverse Geocoding Api
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, 'error').mockImplementation(() => {});

        global.fetch = jest.fn() as jest.Mock;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns parsed MapLocation when API succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                features: [
                    {
                        properties: {
                            name: 'Concordia University',
                            full_address: '1455 De Maisonneuve Blvd W',
                        },
                    },
                ],
            }),
        });

        const result = await mapboxMapsAdapter.reverse(45.497, -73.578);

        expect(global.fetch).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
            id: '0',
            name: 'Concordia University',
            address: '1455 De Maisonneuve Blvd W',
        });
    });

    it('returns null when response is not ok', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        const result = await mapboxMapsAdapter.reverse(45.497, -73.578);

        expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error('Network error')
        );

        const result = await mapboxMapsAdapter.reverse(45.497, -73.578);

        expect(result).toBeNull();
    });
});


describe('mapboxMapsAdapter.search', () => { // Testing the Search API
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, 'error').mockImplementation(() => {});

        global.fetch = jest.fn() as jest.Mock;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns parsed MapLocation when API succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                suggestions: [
                    {
                        name: "Concordia University",
                        id: "mbx123",
                        address: "1455 De Maisonneuve Blvd W"
                    },
                    {
                        name: "McGill University",
                        id: "mbx456",
                        address: "845 Sherbrooke St W"
                    }
                ],
            }),
        });

        const result = await mapboxMapsAdapter.search("abcs", null, "abcsd");

        expect(global.fetch).toHaveBeenCalledTimes(1);

        expect(result).toEqual([
            {
                name: "Concordia University",
                id: undefined,
                address: "1455 De Maisonneuve Blvd W"
            },
            {
                name: "McGill University",
                id: undefined,
                address: "845 Sherbrooke St W"
            }
        ]);
    });
    it('returns null when response is not ok', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        const result = await mapboxMapsAdapter.search("Concordia University", null, "abcsd");

        expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error('Network error')
        );

        const result = await mapboxMapsAdapter.search("Concordia University", null, "abcsd");

        expect(result).toBeNull();
    });
});



describe('mapboxMapsAdapter.retrieve', () => { // Testing the Retrieve API
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, 'error').mockImplementation(() => {});

        global.fetch = jest.fn() as jest.Mock;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns parsed MapLocation when API succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
            "type": "FeatureCollection",
                "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-73.5823, 45.4970]
                    },
                    "properties": {
                        "name": "McGill University",
                        "mapbox_id": "way.12345",
                        "full_address": "845 Sherbrooke St W, Montreal, QC H3A 0G4, Canada",
                        "feature_type": "amenity"
                    }
                }
            ]
        }),
        });

        const result = await mapboxMapsAdapter.retrieve("0", null, "abcsd");

        expect(global.fetch).toHaveBeenCalledTimes(1);

        expect(result).toEqual([-73.5823, 45.4970]);
    });
    it('returns null when response is not ok', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        const result = await mapboxMapsAdapter.retrieve("0", null, "abcsd");

        expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error('Network error')
        );

        const result = await mapboxMapsAdapter.retrieve("0", null, "abcsd");

        expect(result).toBeNull();
    });
});


describe('mapboxMapsAdapter.forward', () => { // Testing the Forward API
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, 'error').mockImplementation(() => {});

        global.fetch = jest.fn() as jest.Mock;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns parsed MapLocation when API succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [-73.5823, 45.4970]
                        },
                        "properties": {
                            "name": "McGill University",
                            "mapbox_id": "way.12345",
                            "full_address": "845 Sherbrooke St W, Montreal, QC H3A 0G4, Canada",
                            "feature_type": "hujchgj"
                        }
                    }
                ]
            }),
        });

        const result = await mapboxMapsAdapter.forward("845 Sherbrooke St W, Montreal, QC H3A 0G4, Canada");

        expect(global.fetch).toHaveBeenCalledTimes(1);

        expect(result).toEqual([-73.5823, 45.4970]);
    });
    it('returns null when response is not ok', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        const result = await mapboxMapsAdapter.forward("845 Sherbrooke St W, Montreal, QC H3A 0G4, Canada");

        expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error('Network error')
        );

        const result = await mapboxMapsAdapter.forward("845 Sherbrooke St W, Montreal, QC H3A 0G4, Canada");

        expect(result).toBeNull();
    });
});







