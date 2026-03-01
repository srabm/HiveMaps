import {renderHook, waitFor} from '@testing-library/react-native';
import {useShuttleRouting} from '@/hooks/use-shuttle-routing';
import {SHUTTLE_STOPS} from '@/services/data/shuttle-stops';

const mockDirectionsResponse = {
    distanceMeters: 500,
    durationSeconds: 360,
    polyline: 'mockPolyline',
    steps: [],
};

jest.mock('@/services/maps/directions-api-adapter', () => {
    const actual = jest.requireActual('@/services/maps/directions-api-adapter');
    return {
        ...actual,
        getDirections: jest.fn().mockResolvedValue({
            distanceMeters: 500,
            durationSeconds: 360,
            polyline: 'mockPolyline',
            steps: [],
        }),
    };
});

const {getDirections} = require('@/services/maps/directions-api-adapter');

const SGW = {latitude: 45.497, longitude: -73.579};
const LOY = {latitude: 45.458, longitude: -73.639};
const TEST_TIME_FILTER = '2026-02-23T12:00:00Z';
const TEST_TIME_FILTER_MODE = 'depart' as const;

afterEach(() => {
    jest.clearAllMocks();
});

describe('useShuttleRouting — disabled / missing inputs', () => {
    it('returns all nulls when enabled=false', () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: false, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        expect(result.current.walkToStop).toBeNull();
        expect(result.current.shuttleLeg).toBeNull();
        expect(result.current.walkFromStop).toBeNull();
        expect(result.current.stopsForTrip).toBeNull();
    });

    it('returns all nulls when origin is null', () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: null, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        expect(result.current.walkToStop).toBeNull();
        expect(result.current.shuttleLeg).toBeNull();
        expect(result.current.walkFromStop).toBeNull();
        expect(result.current.stopsForTrip).toBeNull();
    });

    it('returns all nulls when destination is null', () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: null, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        expect(result.current.walkToStop).toBeNull();
        expect(result.current.shuttleLeg).toBeNull();
        expect(result.current.walkFromStop).toBeNull();
        expect(result.current.stopsForTrip).toBeNull();
    });

    it('does not call getDirections when disabled', () => {
        renderHook(() =>
            useShuttleRouting({enabled: false, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        expect(getDirections).not.toHaveBeenCalled();
    });
});

describe('useShuttleRouting — always returns stopMarkers', () => {
    it('stopMarkers always equals SHUTTLE_STOPS regardless of enabled state', () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: false, origin: null, destination: null, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        expect(result.current.stopMarkers).toEqual(SHUTTLE_STOPS);
    });
});

describe('useShuttleRouting — successful fetch', () => {
    it('populates all three legs after fetch resolves', async () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(result.current.walkToStop).not.toBeNull());
        expect(result.current.walkToStop).toEqual(mockDirectionsResponse);
        expect(result.current.shuttleLeg).toEqual(mockDirectionsResponse);
        expect(result.current.walkFromStop).toEqual(mockDirectionsResponse);
    });

    it('sets stopsForTrip correctly when origin is near SGW', async () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(result.current.stopsForTrip).not.toBeNull());
        expect(result.current.stopsForTrip?.originStop.id).toBe('SGW');
        expect(result.current.stopsForTrip?.destinationStop.id).toBe('LOY');
    });

    it('sets stopsForTrip correctly when origin is near LOY', async () => {
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: LOY, destination: SGW, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(result.current.stopsForTrip).not.toBeNull());
        expect(result.current.stopsForTrip?.originStop.id).toBe('LOY');
        expect(result.current.stopsForTrip?.destinationStop.id).toBe('SGW');
    });

    it('calls getDirections exactly 3 times (walkTo, shuttle, walkFrom)', async () => {
        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(getDirections).toHaveBeenCalledTimes(3));
    });

    it('first call uses WALKING mode (walk to stop)', async () => {
        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(getDirections).toHaveBeenCalled());
        const {TransportMode, Provider} = jest.requireActual('@/services/maps/directions-api-adapter');
        const firstCall = getDirections.mock.calls[0][0];
        expect(firstCall.transportMode).toBe(TransportMode.WALKING);
        expect(firstCall.provider).toBe(Provider.MAPBOX);
    });

    it('second call uses DRIVING mode (shuttle leg)', async () => {
        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(getDirections).toHaveBeenCalledTimes(3));
        const {TransportMode} = jest.requireActual('@/services/maps/directions-api-adapter');
        expect(getDirections.mock.calls[1][0].transportMode).toBe(TransportMode.DRIVING);
    });

    it('third call uses WALKING mode (walk from stop)', async () => {
        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(getDirections).toHaveBeenCalledTimes(3));
        const {TransportMode} = jest.requireActual('@/services/maps/directions-api-adapter');
        expect(getDirections.mock.calls[2][0].transportMode).toBe(TransportMode.WALKING);
    });

    it('chains depart-mode request times forward across all three legs', async () => {
        getDirections
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 600}) // walkTo
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 900}) // shuttle
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 300}); // walkFrom

        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: 'depart'})
        );

        await waitFor(() => expect(getDirections).toHaveBeenCalledTimes(3));

        expect(getDirections.mock.calls[0][0].timeFilter).toBe('2026-02-23T12:00:00Z');
        expect(getDirections.mock.calls[1][0].timeFilter).toBe('2026-02-23T12:10:00.000Z');
        expect(getDirections.mock.calls[2][0].timeFilter).toBe('2026-02-23T12:25:00.000Z');

        expect(getDirections.mock.calls[0][0].timeFilterMode).toBe('depart');
        expect(getDirections.mock.calls[1][0].timeFilterMode).toBe('depart');
        expect(getDirections.mock.calls[2][0].timeFilterMode).toBe('depart');
    });

    it('chains arrive-mode request times backward across all three legs', async () => {
        getDirections
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 300}) // walkFrom
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 900}) // shuttle
            .mockResolvedValueOnce({...mockDirectionsResponse, durationSeconds: 600}); // walkTo

        renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: 'arrive'})
        );

        await waitFor(() => expect(getDirections).toHaveBeenCalledTimes(3));

        expect(getDirections.mock.calls[0][0].timeFilter).toBe('2026-02-23T12:00:00Z');
        expect(getDirections.mock.calls[1][0].timeFilter).toBe('2026-02-23T11:55:00.000Z');
        expect(getDirections.mock.calls[2][0].timeFilter).toBe('2026-02-23T11:40:00.000Z');

        expect(getDirections.mock.calls[0][0].timeFilterMode).toBe('arrive');
        expect(getDirections.mock.calls[1][0].timeFilterMode).toBe('arrive');
        expect(getDirections.mock.calls[2][0].timeFilterMode).toBe('arrive');
    });
});

describe('useShuttleRouting — fetch failure', () => {
    it('resets all legs to null on error', async () => {
        getDirections.mockRejectedValueOnce(new Error('network failure'));
        const {result} = renderHook(() =>
            useShuttleRouting({enabled: true, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE})
        );
        await waitFor(() => expect(result.current.stopsForTrip).not.toBeNull());
        expect(result.current.walkToStop).toBeNull();
        expect(result.current.shuttleLeg).toBeNull();
        expect(result.current.walkFromStop).toBeNull();
    });
});

describe('useShuttleRouting — re-fetch on input change', () => {
    it('clears legs when enabled switches from true to false', async () => {
        const {result, rerender} = renderHook(
            ({enabled}: {enabled: boolean}) =>
                useShuttleRouting({enabled, origin: SGW, destination: LOY, timeFilter: TEST_TIME_FILTER, timeFilterMode: TEST_TIME_FILTER_MODE}),
            {initialProps: {enabled: true}}
        );
        await waitFor(() => expect(result.current.walkToStop).not.toBeNull());

        rerender({enabled: false});
        expect(result.current.walkToStop).toBeNull();
    });
});
