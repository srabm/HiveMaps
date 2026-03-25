export type CalendarEvent = {

    id: string;
    summary?: string;
    location?: string | null;
    start: {dateTime: string; date?: string};
    end: {dateTime: string; date?: string};
};

export type NextClassResult = 
    {status: 'found'; event: CalendarEvent; roomCode: string; startsAt: Date}
    | {status: 'no_location'; event: CalendarEvent; startsAt: Date}
    | {status: 'none'};

const ROOM_CODE_REGEX = /([A-Z]+)(\d+)\.(\d+)/;

export function parseRoomCode(location: string | null | undefined): string | null {
    if (!location || !location.trim()) {
        return null;
    }   
    const match = location.match(ROOM_CODE_REGEX);
    if (!match) {
        return null;
    }

    const building = match[1].toUpperCase();
    const room = match[2];
    return `${building}-${room}`;
} 

function parseEventStart(event: CalendarEvent): Date | null {
    const raw = event.start.dateTime ?? event.start.date;
    if (!raw) {
        return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

export function getNextClass(events: CalendarEvent[], now: Date = new Date()): NextClassResult {
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const upcomingEvents = events.map((event) => {
        const startsAt = parseEventStart(event);
        if (!startsAt) {
            return null;
        }
        if (startsAt < now) {
            return null;
        }
        if (startsAt > windowEnd) {
            return null;
        }
        return {event, startsAt};
    })
    .filter((entry): entry is {event: CalendarEvent; startsAt: Date} => entry !== null)
    .sort((a, b) => a.startsAt.getTime() -b.startsAt.getTime());

    if (upcomingEvents.length === 0) {
        return {status: 'none'};
    }

    const nextEvent = upcomingEvents[0];
    const roomCode = parseRoomCode(nextEvent.event.location);

    if (!roomCode) {
        return {
            status: 'no_location',
            event: nextEvent.event,
            startsAt: nextEvent.startsAt,
        };
    }

    return {
        status: 'found',
        event: nextEvent.event,
        roomCode,
        startsAt: nextEvent.startsAt,
    };
}