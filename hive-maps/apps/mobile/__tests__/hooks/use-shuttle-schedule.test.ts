import {renderHook} from '@testing-library/react-native';
import {useShuttleSchedule} from '@/hooks/use-shuttle-schedule';

// Coordinates near each campus
const SGW = {latitude: 45.497, longitude: -73.579};
const LOY = {latitude: 45.458, longitude: -73.639};

// Helper: build a Date for a specific day-of-week and time on the current/next occurrence
const makeDateOnWeekday = (isoString: string) => new Date(isoString);

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('useShuttleSchedule — disabled', () => {
    it('returns null when enabled=false', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: false, origin: SGW, destination: LOY})
        );
        expect(result.current).toBeNull();
    });
});

describe('useShuttleSchedule — weekday (Mon-Thu)', () => {
    beforeEach(() => {
        // Monday Feb 17 2026 at 09:00 — before any departures
        jest.setSystemTime(new Date('2026-02-17T09:00:00'));
    });

    it('returns a non-null context on a weekday', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current).not.toBeNull();
    });

    it('directionLabel reflects SGW → Loyola direction', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.directionLabel).toMatch(/SGW/);
        expect(result.current?.directionLabel).toMatch(/Loyola/);
    });

    it('directionLabel reflects LOY → SGW direction when origin is LOY', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: LOY, destination: SGW})
        );
        expect(result.current?.directionLabel).toMatch(/Loyola/);
        expect(result.current?.directionLabel).toMatch(/SGW/);
    });

    it('departures array has at most `limit` items (default 5)', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect((result.current?.departures.length ?? 0)).toBeLessThanOrEqual(5);
    });

    it('respects custom limit', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY, limit: 2})
        );
        expect((result.current?.departures.length ?? 0)).toBeLessThanOrEqual(2);
    });

    it('all departures have minutesUntil >= 0', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        result.current?.departures.forEach((d) => {
            expect(d.minutesUntil).toBeGreaterThanOrEqual(0);
        });
    });

    it('showNextServiceLabel is false for a same-day service date', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.showNextServiceLabel).toBe(false);
    });

    it('showSeeMoreButton is true when there are more times than limit', () => {
        // With limit=1 there will almost certainly be more times in the schedule
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY, limit: 1})
        );
        expect(result.current?.showSeeMoreButton).toBe(true);
    });

    it('departureTimes is a non-empty array on a weekday', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.departureTimes.length).toBeGreaterThan(0);
    });
});

describe('useShuttleSchedule — after last departure (same weekday)', () => {
    beforeEach(() => {
        // Monday Feb 17 2026 at 23:00 — all Mon-Thu SGW departures are done (last is 18:30)
        jest.setSystemTime(new Date('2026-02-17T23:00:00'));
    });

    it('advances to the next service day when all departures have passed', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.showNextServiceLabel).toBe(true);
        expect(result.current?.isNextServiceDay).toBe(true);
    });

    it('serviceDate is different from today', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        const today = new Date('2026-02-17T23:00:00');
        expect(result.current?.serviceDate.toDateString()).not.toBe(today.toDateString());
    });
});

describe('useShuttleSchedule — Friday schedule', () => {
    beforeEach(() => {
        // Friday Feb 20 2026 at 09:00
        jest.setSystemTime(new Date('2026-02-20T09:00:00'));
    });

    it('returns a non-null context on Friday', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current).not.toBeNull();
    });

    it('Friday departureTimes are from the friday schedule', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        // Friday SGW first departure is 09:45
        expect(result.current?.departureTimes).toContain('09:45');
    });

    it('uses explicit timeFilter (not wall clock) to select the service day', () => {
        // System time is Friday from beforeEach, but the filter points to Monday.
        const {result} = renderHook(() =>
            useShuttleSchedule({
                enabled: true,
                origin: SGW,
                destination: LOY,
                timeFilter: '2026-02-23T09:00:00Z',
            })
        );
        expect(result.current?.serviceDate.getDay()).toBe(1); // Monday
        expect(result.current?.departureTimes).toContain('09:30'); // SGW Monday-Thursday includes 09:30
    });
});

describe('useShuttleSchedule — weekend (no service)', () => {
    beforeEach(() => {
        // Saturday Feb 21 2026 at 10:00
        jest.setSystemTime(new Date('2026-02-21T10:00:00'));
    });

    it('advances past the weekend to Monday', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.showNextServiceLabel).toBe(true);
        // Next service day from Saturday should be Monday
        expect(result.current?.serviceDate.getDay()).toBe(1); // 1 = Monday
    });

    it('departures are populated for the next Monday', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({enabled: true, origin: SGW, destination: LOY})
        );
        expect(result.current?.departures.length).toBeGreaterThan(0);
    });
});

describe('useShuttleSchedule — arrive mode filtering', () => {
    beforeEach(() => {
        // Monday Feb 23 2026 at noon
        jest.setSystemTime(new Date('2026-02-23T12:00:00'));
    });

    it('returns only departures at or before the arrive-by time', () => {
        const {result} = renderHook(() =>
            useShuttleSchedule({
                enabled: true,
                origin: SGW,
                destination: LOY,
                timeFilter: '2026-02-23T12:00:00Z',
                timeFilterMode: 'arrive',
            })
        );
        result.current?.departures.forEach((item) => {
            expect(item.minutesFromFilter).toBeLessThanOrEqual(0);
        });
    });
});
