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

export type ParsedLocationReference = {
    buildingCode: string | null;
    buildingName: string | null;
    roomCode: string | null;
    roomNumber: string | null;
};

const ROOM_CODE_REGEX = /\b([A-Z]{1,6})-([A-Z]?\d{1,4}(?:\.\d+)?)\b/i;
const ROOM_REFERENCE_REGEX = /\bRM\.?\s+([A-Z]?\d{1,4}(?:\.\d+)?)\b/i;
const BUILDING_CODE_REGEX = /\(([A-Z]{1,6})\)/i;

function getRoomMarkerIndex(locationSegment: string): number {
    const upperSegment = locationSegment.toUpperCase();
    const candidates = [' RM. ', ' RM '];

    for (const marker of candidates) {
        const markerIndex = upperSegment.indexOf(marker);
        if (markerIndex > 0) {
            return markerIndex;
        }
    }

    return -1;
}

function getRoomNumberFromRoomCode(roomCode: string): string | null {
    const separatorIndex = roomCode.indexOf('-');
    if (separatorIndex < 0 || separatorIndex === roomCode.length - 1) {
        return null;
    }

    return roomCode.slice(separatorIndex + 1).toUpperCase();
}

export function parseLocationReference(location: string | null | undefined): ParsedLocationReference | null {
    if (!location?.trim()) {
        return null;
    }

    const explicitRoomCodeMatch = ROOM_CODE_REGEX.exec(location);
    if (explicitRoomCodeMatch) {
        const roomCode = explicitRoomCodeMatch[0].toUpperCase();
        return {
            buildingCode: roomCode.split('-')[0] ?? null,
            buildingName: null,
            roomCode,
            roomNumber: getRoomNumberFromRoomCode(roomCode),
        };
    }

    const locationSegment = location.split(' - ').pop()?.trim() ?? location.trim();
    const roomMatch = ROOM_REFERENCE_REGEX.exec(locationSegment);
    if (!roomMatch) {
        return null;
    }

    const roomNumber = roomMatch[1].toUpperCase();

    const buildingCodeMatch = BUILDING_CODE_REGEX.exec(locationSegment);
    if (buildingCodeMatch) {
        const buildingCode = buildingCodeMatch[1].toUpperCase();
        return {
            buildingCode,
            buildingName: null,
            roomCode: `${buildingCode}-${roomNumber}`,
            roomNumber,
        };
    }

    const roomMarkerIndex = getRoomMarkerIndex(locationSegment);
    if (roomMarkerIndex <= 0) {
        return null;
    }

    return {
        buildingCode: null,
        buildingName: locationSegment.slice(0, roomMarkerIndex).trim(),
        roomCode: null,
        roomNumber,
    };
}

export function parseRoomCode(location: string | null | undefined): string | null {
    return parseLocationReference(location)?.roomCode ?? null;
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
