import {parseRoomCode, getNextClass, type CalendarEvent} from '../../services/next-class-parser';

const NOW = new Date('2025-01-15T09:00:00.000Z');

const at = (offsetMinutes: number): string => new Date(NOW.getTime() + offsetMinutes * 60 * 1000).toISOString();

const makeEvent = (
    id: string,
    startOffsetMin: number,
    location: string | null | undefined = 'H-820',
): CalendarEvent => ({
    id,
    summary: `Test ${id}`,
    location,
    start: {dateTime: at(startOffsetMin)},
    end: {dateTime: at(startOffsetMin + 50)},
});

describe('parseRoomCode', () => {
    describe('valid Concordia room codes', () => {
        it('parses a H building room', () => expect(parseRoomCode('H-820')).toBe('H-820'));
        it('parses a MB building room', () => expect(parseRoomCode('MB-3.255')).toBe('MB-3.255'));
        it('parses MB room with letter-prefix decimal', () => expect(parseRoomCode('MB-S2.330')).toBe('MB-S2.330'));
        it('parses EV building room', () => expect(parseRoomCode('EV-7.402')).toBe('EV-7.402'));
        it('parses FG building room', () => expect(parseRoomCode('FG-B050')).toBe('FG-B050'));
        it('extracts room in a longer string', () => expect(parseRoomCode('SGW / MB-S2.330')).toBe('MB-S2.330'));
        it('uppercases the result', () => expect(parseRoomCode('h-820')).toBe('H-820'));
    });

    describe('invalid or empty inputs', () => {
        it('returns null for online class', () => expect(parseRoomCode('Online - Async')).toBeNull());
        it('returns null for TBA', () => expect(parseRoomCode('TBA')).toBeNull());
        it('return null for empty string', () => expect(parseRoomCode('')).toBeNull());
        it('returns null for null input', () => expect(parseRoomCode(null)).toBeNull());
        it('returns null for undefined input', () => expect(parseRoomCode(undefined)).toBeNull());
    });
});

describe('getNextClass', () => {
    describe('ignores past events', () => {
        it('returns none for an empty event list', () => {
            expect(getNextClass([], NOW)).toEqual({status: "none"});
        });
        it('ignores an event that started in the past', () => {
            const events = [makeEvent('past', -30)];
            expect(getNextClass(events, NOW).status).toBe('none');
        });
        it('ignores an event that started exactly 1ms before now', () => {
            const events: CalendarEvent[] = [{
                id: 'just-past',
                start: {dateTime: new Date(NOW.getTime() - 1).toISOString()},
                end:   {dateTime: at(50)},
                location: 'H-820',
            }];
            expect(getNextClass(events, NOW).status).toBe('none');
        });
        it('ignores events beyond the 2-hour window', () => {
            const events = [makeEvent('far', 121)];
            expect(getNextClass(events, NOW).status).toBe('none');
        });
        it('ignores past events even when a valid in-window event also exists', () => {
            const events = [
                makeEvent('past', -60),
                makeEvent('upcoming', 30),
            ];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') expect(result.event.id).toBe('upcoming');
        });
    });

    describe('identifies the nearest upcoming event', () => {
        it('includes an event starting exactly now', () => {
            const events = [makeEvent('now', 0)];
            expect(getNextClass(events, NOW).status).toBe('found');
        });
        it('includes an event starting at exactly the 2-hour boundary', () => {
            const events = [makeEvent('boundary', 120)];
            expect(getNextClass(events, NOW).status).toBe('found');
        });
        it('picks the soonest event when multiple are in the window', () => {
            const events = [
                makeEvent('far',  90, 'EV-2.184'),
                makeEvent('near', 30, 'H-820'),
                makeEvent('mid',  60, 'MB-3.255'),
            ];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') {
                expect(result.event.id).toBe('near');
                expect(result.roomCode).toBe('H-820');
            }
        });
        it('exposes the correct startsAt timestamp', () => {
            const events = [makeEvent('e1', 45)];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') {
                expect(result.startsAt.toISOString()).toBe(at(45));
            }
        });
    });

    describe('correctly parses the Location field', () => {
        it('returns found with roomCode for a valid location', () => {
            const events = [makeEvent('e1', 30, 'MB-S2.330')];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') expect(result.roomCode).toBe('MB-S2.330');
        });
        it('handles a location string that embeds the room code', () => {
            const events = [makeEvent('e1', 30, 'SGW / MB-3.255')];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') expect(result.roomCode).toBe('MB-3.255');
        });
    });

    describe('displays no_location status instead of crashing', () => {
        it('returns no_location when location is an empty string', () => {
            const events = [makeEvent('e1', 30, '')];
            expect(getNextClass(events, NOW).status).toBe('no_location');
        });
        it('returns no_location when location is null', () => {
            const events = [makeEvent('e1', 30, null)];
            expect(getNextClass(events, NOW).status).toBe('no_location');
        });
        it('returns no_location when location field is missing entirely', () => {
            const events: CalendarEvent[] = [{
                id: 'e1',
                start: {dateTime: at(30)},
                end:   {dateTime: at(80)},
            }];
            expect(getNextClass(events, NOW).status).toBe('no_location');
        });
        it('returns no_location for an online class — does not crash', () => {
            const events = [makeEvent('e1', 30, 'Online - Async')];
            expect(getNextClass(events, NOW).status).toBe('no_location');
        });
        it('no_location result carries the event and startsAt for UI display', () => {
            const events = [makeEvent('noloc', 45, '')];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('no_location');
            if (result.status === 'no_location') {
                expect(result.event.id).toBe('noloc');
                expect(result.startsAt).toBeInstanceOf(Date);
            }
        });
        it('skips events with malformed dateTime without throwing', () => {
            const events: CalendarEvent[] = [
                {id: 'bad',  start: {dateTime: 'not-a-date'}, end: {dateTime: ''}, location: 'H-820'},
                makeEvent('good', 30),
            ];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') expect(result.event.id).toBe('good');
        });
        it('skips events with a missing start value without throwing', () => {
            const events: CalendarEvent[] = [
                {id: 'bad', start: {dateTime: ''}, end: {dateTime: at(50)}, location: 'H-820'},
                makeEvent('good', 30),
            ];
            const result = getNextClass(events, NOW);
            expect(result.status).toBe('found');
            if (result.status === 'found') expect(result.event.id).toBe('good');
        });
    });
});
