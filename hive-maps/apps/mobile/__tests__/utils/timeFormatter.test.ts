import {
    formatISOToTime,
    formatTimeToISO,
    getCurrentTimeISO,
    toISOString,
} from '../../utils/timeFormatter';

describe('timeFormatter', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('formats ISO time into h:mm AM/PM', () => {
        expect(formatISOToTime('2026-03-02T09:05:00.000Z')).toMatch(/^\d{1,2}:05 (AM|PM)$/);
        expect(formatISOToTime('2026-03-02T15:30:00.000Z')).toMatch(/^\d{1,2}:30 (AM|PM)$/);
    });

    it('returns fallback message when formatISOToTime throws', () => {
        jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => {
            throw new Error('boom');
        });

        expect(formatISOToTime('2026-03-02T09:05:00.000Z')).toBe('Error displaying time');
    });

    it('converts human-readable AM/PM time to ISO for today', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-03-02T16:00:00.000Z'));

        const morning = formatTimeToISO('9:05 AM');
        const noon = formatTimeToISO('12:00 PM');
        const midnight = formatTimeToISO('12:00 AM');

        const now = new Date();
        expect(morning).toBe(toISOString(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 5, 0, 0)));
        expect(noon).toBe(toISOString(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)));
        expect(midnight).toBe(toISOString(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)));
    });

    it('falls back to current ISO when input does not match expected time format', () => {
        jest.useFakeTimers();
        const fixedNow = new Date('2026-03-02T16:00:00.000Z');
        jest.setSystemTime(fixedNow);

        expect(formatTimeToISO('invalid')).toBe(toISOString(new Date()));
    });

    it('falls back to current ISO when formatTimeToISO throws', () => {
        jest.useFakeTimers();
        const fixedNow = new Date('2026-03-02T16:00:00.000Z');
        jest.setSystemTime(fixedNow);

        jest.spyOn(Number, 'parseInt').mockImplementation(() => {
            throw new Error('boom');
        });

        expect(formatTimeToISO('9:05 AM')).toBe(toISOString(new Date()));
    });

    it('returns current time in ISO format', () => {
        jest.useFakeTimers();
        const fixedNow = new Date('2026-03-02T16:00:00.000Z');
        jest.setSystemTime(fixedNow);

        expect(getCurrentTimeISO()).toBe(toISOString(new Date()));
    });
});
