export type CalendarEvent = {

    id: string;
    summary?: string;
    location?: string | null;
    start: {dateTime?: string | null; date?: string | null};
    end: {dateTime?: string | null; date?: string | null};
};

export type NextClassResult = 
    {status: 'found'; event: CalendarEvent; roomCode: string; startsAt: Date}
    | {status: 'no_location'; event: CalendarEvent; startsAt: Date}
    | {status: 'none'};

const ROOM_CODE_REGEX = /\b([A-Z]{1,6})-([A-Z]?\d{1,4}(?:\.\d+)?)\b/i;
const ROOM_REFERENCE_REGEX = /\bRM\.?\s+([A-Z]?\d{1,4}(?:\.\d+)?)\b/i;
const BUILDING_CODE_REGEX = /\(([A-Z]{1,6})\)/i;
const BUILDING_NAME_REGEX = /^(.+?)\s+RM\.?\s+[A-Z]?\d{1,4}(?:\.\d+)?$/i;

const BUILDING_NAME_TO_CODE: Record<string, string> = {
    'FAUBOURG TOWER': 'FB',
    'HALL BUILDING': 'H',
    'JOHN MOLSON BUILDING': 'MB',
};

function parseRoomCodeFromBuilderLocation(location: string): string | null {
    const locationSegment = location.split(' - ').pop()?.trim() ?? location.trim();
    const roomMatch = ROOM_REFERENCE_REGEX.exec(locationSegment);
    if (!roomMatch) {
        return null;
    }

    const buildingCodeMatch = BUILDING_CODE_REGEX.exec(locationSegment);
    if (buildingCodeMatch) {
        return `${buildingCodeMatch[1].toUpperCase()}-${roomMatch[1].toUpperCase()}`;
    }

    const buildingNameMatch = BUILDING_NAME_REGEX.exec(locationSegment);
    if (!buildingNameMatch) {
        return null;
    }

    const buildingName = buildingNameMatch[1].trim().toUpperCase();
    const buildingCode = BUILDING_NAME_TO_CODE[buildingName];

    if (!buildingCode) {
        return null;
    }

    return `${buildingCode}-${roomMatch[1].toUpperCase()}`;
}

export function parseRoomCode(location: string | null | undefined): string | null {
    if (!location?.trim()) {
        return null;
    }   
    const match = ROOM_CODE_REGEX.exec(location);
    if (!match) {
        return parseRoomCodeFromBuilderLocation(location);
    }

    return match[0].toUpperCase();
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
