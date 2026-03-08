import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLiveLocation } from '@/hooks/use-live-location';

// ─── Mock expo-location ───────────────────────────────────────────────────────

type WatchCallback = (pos: {
    coords: {
        latitude: number;
        longitude: number;
        heading: number | null;
        accuracy: number | null;
    };
}) => void;

let capturedWatchCallback: WatchCallback | null = null;
const mockRemove = jest.fn();

const mockWatchPositionAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();

jest.mock('expo-location', () => ({
    Accuracy: { BestForNavigation: 6 },
    requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
    watchPositionAsync: (opts: unknown, cb: WatchCallback) => mockWatchPositionAsync(opts, cb),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function grantPermission() {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
}

function denyPermission() {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
}

function emitPosition(lat: number, lon: number, heading: number | null = null, accuracy: number | null = 5) {
    capturedWatchCallback?.({ coords: { latitude: lat, longitude: lon, heading, accuracy } });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    capturedWatchCallback = null;
    mockWatchPositionAsync.mockImplementation((_opts: unknown, cb: WatchCallback) => {
        capturedWatchCallback = cb;
        return Promise.resolve({ remove: mockRemove });
    });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLiveLocation — disabled', () => {
    it('returns null location when enabled is false', () => {
        const { result } = renderHook(() => useLiveLocation(false));
        expect(result.current.location).toBeNull();
    });

    it('does not request permissions when disabled', () => {
        renderHook(() => useLiveLocation(false));
        expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('permissionGranted is false initially', () => {
        const { result } = renderHook(() => useLiveLocation(false));
        expect(result.current.permissionGranted).toBe(false);
    });

    it('error is null initially', () => {
        const { result } = renderHook(() => useLiveLocation(false));
        expect(result.current.error).toBeNull();
    });
});

describe('useLiveLocation — permission denied', () => {
    beforeEach(() => denyPermission());

    it('sets permissionGranted to false', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled());
        expect(result.current.permissionGranted).toBe(false);
    });

    it('sets error message when permission denied', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(result.current.error).toMatch(/denied/i));
    });

    it('does not start position watcher', async () => {
        renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled());
        expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    });
});

describe('useLiveLocation — permission granted', () => {
    beforeEach(() => grantPermission());

    it('sets permissionGranted to true', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(result.current.permissionGranted).toBe(true));
    });

    it('clears error when permission granted', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockWatchPositionAsync).toHaveBeenCalled());
        expect(result.current.error).toBeNull();
    });

    it('starts the position watcher', async () => {
        renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1));
    });

    it('requests BestForNavigation accuracy', async () => {
        renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockWatchPositionAsync).toHaveBeenCalled());
        const opts = mockWatchPositionAsync.mock.calls[0][0];
        expect(opts.accuracy).toBe(6);
    });

    it('updates location when GPS position fires', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(capturedWatchCallback).not.toBeNull());

        act(() => emitPosition(45.4971, -73.5785, 90, 4));

        expect(result.current.location).toEqual({
            latitude: 45.4971,
            longitude: -73.5785,
            heading: 90,
            accuracy: 4,
        });
    });

    it('updates location on each new GPS reading', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(capturedWatchCallback).not.toBeNull());

        act(() => emitPosition(45.4971, -73.5785));
        act(() => emitPosition(45.4972, -73.5786));

        expect(result.current.location?.latitude).toBeCloseTo(45.4972);
        expect(result.current.location?.longitude).toBeCloseTo(-73.5786);
    });

    it('handles null heading from GPS', async () => {
        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(capturedWatchCallback).not.toBeNull());

        act(() => emitPosition(45.4971, -73.5785, null));

        expect(result.current.location?.heading).toBeNull();
    });
});

describe('useLiveLocation — cleanup', () => {
    beforeEach(() => grantPermission());

    it('removes watcher on unmount', async () => {
        const { unmount } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(mockWatchPositionAsync).toHaveBeenCalled());
        unmount();
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('removes watcher when enabled switches to false', async () => {
        const { rerender } = renderHook<ReturnType<typeof useLiveLocation>, { enabled: boolean }>(
            ({ enabled }) => useLiveLocation(enabled),
            { initialProps: { enabled: true } },
        );
        await waitFor(() => expect(mockWatchPositionAsync).toHaveBeenCalled());
        act(() => rerender({ enabled: false }));
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('does not update location after unmount', async () => {
        const { result, unmount } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(capturedWatchCallback).not.toBeNull());
        unmount();

        // GPS fires after unmount — should not throw or update state
        act(() => emitPosition(45.499, -73.580));

        expect(result.current.location).toBeNull();
    });
});

describe('useLiveLocation — error handling', () => {
    it('sets error when watchPositionAsync throws', async () => {
        grantPermission();
        mockWatchPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));

        const { result } = renderHook(() => useLiveLocation(true));
        await waitFor(() => expect(result.current.error).toMatch(/failed to start/i));
        expect(result.current.location).toBeNull();
    });
});

describe('useLiveLocation — unmount during async permission request (line 40)', () => {
    it('does not update state if component unmounts before permission resolves', async () => {
        // Permission resolves after a tick — unmount happens first
        let resolvePermission!: (v: any) => void;
        mockRequestForegroundPermissionsAsync.mockReturnValueOnce(
            new Promise((res) => { resolvePermission = res; }),
        );

        const { result, unmount } = renderHook(() => useLiveLocation(true));

        // Unmount before permission promise settles
        unmount();

        // Now let the permission resolve — should not throw or update state
        act(() => resolvePermission({ status: 'granted' }));

        // location stays null — no setState called on dead component
        expect(result.current.location).toBeNull();
        expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    });
});