import {renderHook, act} from '@testing-library/react-native';
import {useNextClass} from '@/hooks/use-next-class';
import type {CalendarEvent} from '@/services/next-class-parser';

const NOW = new Date('2025-01-15T09:00:00.000Z');
const fixedNow = () => NOW;
const EMPTY_EVENTS: CalendarEvent[] = [];

const at = (offsetMinutes: number): string =>
    new Date(NOW.getTime() + offsetMinutes * 60_000).toISOString();

const makeEvent = (id: string, startOffsetMin: number, location = 'H-820'): CalendarEvent => ({
    id,
    summary: `TEST ${id}`,
    location,
    start: {dateTime: at(startOffsetMin)},
    end:   {dateTime: at(startOffsetMin + 50)},
});

describe('useNextClass', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns none immediately when events is null (3.1/3.2 not yet integrated)', () => {
        const {result} = renderHook(() =>
            useNextClass({events: null, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.result.status).toBe('none');
        expect(result.current.lastChecked).toBeInstanceOf(Date);
    });
    it('returns none for an empty events array', () => {
        const {result} = renderHook(() =>
            useNextClass({events: EMPTY_EVENTS, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.result.status).toBe('none');
    });
    it('returns found when a valid in-window event exists', () => {
        const events = [makeEvent('e1', 30, 'MB-3.255')];
        const {result} = renderHook(() =>
            useNextClass({events, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.result.status).toBe('found');
        if (result.current.result.status === 'found') {
            expect(result.current.result.roomCode).toBe('MB-3.255');
        }
    });
    it('returns no_location when nearest event has no parseable room', () => {
        const events = [makeEvent('e1', 30, 'Online - Async')];
        const {result} = renderHook(() =>
            useNextClass({events, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.result.status).toBe('no_location');
    });
    it('returns no_location for a builder-style location that needs building dataset resolution', () => {
        const events = [makeEvent('e1', 30, 'Sir George Williams Campus - Hall Building Rm 920')];
        const {result} = renderHook(() =>
            useNextClass({events, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.result.status).toBe('no_location');
    });
    it('re-evaluates when the events array changes', () => {
        const {result, rerender} = renderHook(
            ({evts}: {evts: CalendarEvent[] | null}) =>
                useNextClass({events: evts, nowProvider: fixedNow, refreshIntervalMs: 0}),
            {initialProps: {evts: null as CalendarEvent[] | null}},
        );

        expect(result.current.result.status).toBe('none');

        act(() => {
            rerender({evts: [makeEvent('e1', 45, 'EV-2.184')]});
        });

        expect(result.current.result.status).toBe('found');
    });
    it('sets lastChecked to the nowProvider value after first evaluation', () => {
        const {result} = renderHook(() =>
            useNextClass({events: EMPTY_EVENTS, nowProvider: fixedNow, refreshIntervalMs: 0})
        );
        expect(result.current.lastChecked?.toISOString()).toBe(NOW.toISOString());
    });
    it('does not call setState after unmount', () => {
        const events = [makeEvent('e1', 30)];
        const {unmount} = renderHook(() =>
            useNextClass({events, nowProvider: fixedNow, refreshIntervalMs: 100})
        );
        expect(() => unmount()).not.toThrow();
    });
    it('fires on an interval tick when refreshIntervalMs > 0', () => {
        jest.useFakeTimers();

        let callCount = 0;
        const countingNow = () => { callCount++; return NOW; };

        renderHook(() =>
            useNextClass({events: EMPTY_EVENTS, nowProvider: countingNow, refreshIntervalMs: 1000})
        );

        const callsAfterMount = callCount;
        act(() => { jest.advanceTimersByTime(3000); });

        expect(callCount).toBeGreaterThan(callsAfterMount);

        jest.useRealTimers();
    });
    it('does not set an interval when refreshIntervalMs is 0', () => {
        jest.useFakeTimers();
        const spySetInterval = jest.spyOn(global, 'setInterval');

        renderHook(() =>
            useNextClass({events: EMPTY_EVENTS, nowProvider: fixedNow, refreshIntervalMs: 0})
        );

        expect(spySetInterval).not.toHaveBeenCalled();
        spySetInterval.mockRestore();
    });
    it('uses the default refresh interval and now provider when omitted', () => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
        const spySetInterval = jest.spyOn(global, 'setInterval');
        const events = [makeEvent('e1', 30, 'H-820')];

        const {result} = renderHook(() =>
            useNextClass({events})
        );

        expect(result.current.result.status).toBe('found');
        expect(result.current.lastChecked?.toISOString()).toBe(NOW.toISOString());
        expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 60 * 1000);

        spySetInterval.mockRestore();
    });
});
