import {act, renderHook, waitFor} from '@testing-library/react-native';

import {useGoogleCalendarEvents} from '@/hooks/use-google-calendar-events';
import {fetchUpcomingGoogleCalendarEvents} from '@/services/google-calendar';
import type {CalendarEvent} from '@/services/next-class-parser';
import {
    loadGoogleCalendarSelection,
    loadGoogleCalendarSession,
} from '@/storage/auth-storage';

jest.mock('@/services/google-calendar', () => ({
    fetchUpcomingGoogleCalendarEvents: jest.fn(),
}));

jest.mock('@/storage/auth-storage', () => ({
    loadGoogleCalendarSession: jest.fn(),
    loadGoogleCalendarSelection: jest.fn(),
}));

describe('useGoogleCalendarEvents', () => {
    const NOW = new Date('2025-01-15T09:00:00.000Z');
    const nowProvider = () => NOW;

    beforeEach(() => {
        jest.clearAllMocks();
        (loadGoogleCalendarSession as jest.Mock).mockResolvedValue({
            accessToken: 'token',
        });
        (loadGoogleCalendarSelection as jest.Mock).mockResolvedValue({
            selectedCalendarIds: ['calendar-a'],
        });
        (fetchUpcomingGoogleCalendarEvents as jest.Mock).mockResolvedValue([
            {
                id: 'event-1',
                summary: 'SOEN 341 Tutorial',
                location: 'H-920',
                start: {dateTime: '2025-01-15T09:30:00.000Z'},
                end: {dateTime: '2025-01-15T10:20:00.000Z'},
            },
        ]);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('loads upcoming events successfully', async () => {
        const {result} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        expect(result.current.status).toBe('loading');
        expect(result.current.error).toBeNull();

        await waitFor(() => {
            expect(result.current.status).toBe('loaded');
        });

        expect(result.current.events).toEqual([
            {
                id: 'event-1',
                summary: 'SOEN 341 Tutorial',
                location: 'H-920',
                start: {dateTime: '2025-01-15T09:30:00.000Z'},
                end: {dateTime: '2025-01-15T10:20:00.000Z'},
            },
        ]);
        expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalledWith(
            'token',
            ['calendar-a'],
            NOW
        );
    });

    it('returns an empty result when there is no stored session', async () => {
        (loadGoogleCalendarSession as jest.Mock).mockResolvedValue(null);

        const {result} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(result.current.status).toBe('loaded');
        });

        expect(result.current.events).toEqual([]);
        expect(fetchUpcomingGoogleCalendarEvents).not.toHaveBeenCalled();
    });

    it('does nothing if the session request resolves after unmount', async () => {
        let resolveSession!: (value: {accessToken: string} | null) => void;
        (loadGoogleCalendarSession as jest.Mock).mockReturnValue(
            new Promise((resolve) => {
                resolveSession = resolve;
            })
        );

        const {unmount} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        unmount();

        await act(async () => {
            resolveSession({accessToken: 'token'});
            await Promise.resolve();
        });

        expect(fetchUpcomingGoogleCalendarEvents).not.toHaveBeenCalled();
    });

    it('returns an empty result when no calendars are selected', async () => {
        (loadGoogleCalendarSelection as jest.Mock).mockResolvedValue({
            selectedCalendarIds: [],
        });

        const {result} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(result.current.status).toBe('loaded');
        });

        expect(result.current.events).toEqual([]);
        expect(fetchUpcomingGoogleCalendarEvents).not.toHaveBeenCalled();
    });

    it('surfaces a stable error when loading events fails', async () => {
        (fetchUpcomingGoogleCalendarEvents as jest.Mock).mockRejectedValue(
            new Error('Unable to load upcoming Google Calendar events right now.')
        );

        const {result} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(result.current.status).toBe('error');
        });

        expect(result.current.events).toEqual([]);
        expect(result.current.error).toBe('Unable to load upcoming Google Calendar events right now.');
    });

    it('does not update state if the events request resolves after unmount', async () => {
        let resolveEvents!: (value: CalendarEvent[]) => void;
        (fetchUpcomingGoogleCalendarEvents as jest.Mock).mockReturnValue(
            new Promise((resolve) => {
                resolveEvents = resolve;
            })
        );

        const {unmount} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalledTimes(1);
        });

        unmount();

        await act(async () => {
            resolveEvents([]);
            await Promise.resolve();
        });
    });

    it('uses the fallback error message for unknown failures', async () => {
        (fetchUpcomingGoogleCalendarEvents as jest.Mock).mockRejectedValue('boom');

        const {result} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(result.current.status).toBe('error');
        });

        expect(result.current.error).toBe('Unable to load upcoming Google Calendar events right now.');
    });

    it('does not update state if the events request fails after unmount', async () => {
        let rejectEvents!: (reason?: unknown) => void;
        (fetchUpcomingGoogleCalendarEvents as jest.Mock).mockReturnValue(
            new Promise((_, reject) => {
                rejectEvents = reject;
            })
        );

        const {unmount} = renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await waitFor(() => {
            expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalledTimes(1);
        });

        unmount();

        await act(async () => {
            rejectEvents(new Error('late failure'));
            await Promise.resolve();
        });
    });

    it('does not create a polling interval when refreshIntervalMs is 0', async () => {
        jest.useFakeTimers();
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 0})
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(setIntervalSpy).not.toHaveBeenCalled();
        setIntervalSpy.mockRestore();
    });

    it('polls again when refreshIntervalMs is greater than 0', async () => {
        jest.useFakeTimers();

        renderHook(() =>
            useGoogleCalendarEvents({nowProvider, refreshIntervalMs: 1000})
        );

        await waitFor(() => {
            expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalledTimes(2);
        });
    });

    it('uses the default nowProvider and refresh interval when omitted', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        renderHook(() => useGoogleCalendarEvents());

        await waitFor(() => {
            expect(fetchUpcomingGoogleCalendarEvents).toHaveBeenCalled();
        });

        const latestCall = (fetchUpcomingGoogleCalendarEvents as jest.Mock).mock.calls.at(-1);
        expect(latestCall?.[0]).toBe('token');
        expect(latestCall?.[1]).toEqual(['calendar-a']);
        expect(latestCall?.[2]).toBeInstanceOf(Date);
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 1000);
        setIntervalSpy.mockRestore();
    });
});
