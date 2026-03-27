import type {CalendarEvent} from '@/services/next-class-parser';

export type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string | null;
  primary: boolean;
  backgroundColor?: string | null;
};

type GoogleCalendarListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    description?: string | null;
    primary?: boolean;
    backgroundColor?: string | null;
  }>;
};

type GoogleCalendarEventsResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    location?: string | null;
    start?: {dateTime?: string; date?: string};
    end?: {dateTime?: string; date?: string};
  }>;
};

function sortCalendars(calendars: GoogleCalendar[]) {
  return [...calendars].sort((left, right) => {
    if (left.primary !== right.primary) {
      return left.primary ? -1 : 1;
    }

    return left.summary.localeCompare(right.summary);
  });
}

export async function fetchGoogleCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load Google Calendars right now.');
  }

  const payload = (await response.json()) as GoogleCalendarListResponse;
  const calendars = (payload.items ?? [])
    .filter((item): item is Required<Pick<GoogleCalendar, 'id' | 'summary'>> & GoogleCalendar => {
      return typeof item.id === 'string' && typeof item.summary === 'string';
    })
    .map((item) => ({
      id: item.id,
      summary: item.summary,
      description: item.description ?? null,
      primary: Boolean(item.primary),
      backgroundColor: item.backgroundColor ?? null,
    }));

  return sortCalendars(calendars);
}

export function getDefaultSelectedCalendarIds(calendars: GoogleCalendar[]) {
  const primaryCalendar = calendars.find((calendar) => calendar.primary);
  return primaryCalendar ? [primaryCalendar.id] : [];
}

function sortCalendarEvents(events: CalendarEvent[]) {
  return [...events].sort((left, right) => {
    const leftStart = left.start.dateTime ?? left.start.date ?? '';
    const rightStart = right.start.dateTime ?? right.start.date ?? '';
    return leftStart.localeCompare(rightStart);
  });
}

export async function fetchUpcomingGoogleCalendarEvents(
  accessToken: string,
  calendarIds: string[],
  now: Date = new Date()
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) {
    return [];
  }

  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const responses = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const query = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin,
        timeMax,
      });
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Unable to load Google Calendar events right now.');
      }

      const payload = (await response.json()) as GoogleCalendarEventsResponse;
      return (payload.items ?? [])
        .filter((item): item is Required<Pick<CalendarEvent, 'id' | 'start' | 'end'>> & CalendarEvent => {
          return (
            typeof item.id === 'string' &&
            typeof item.start === 'object' &&
            item.start !== null &&
            typeof item.end === 'object' &&
            item.end !== null
          );
        })
        .map((item) => ({
          id: item.id,
          summary: item.summary,
          location: item.location ?? null,
          start: {
            dateTime: item.start.dateTime ?? '',
            date: item.start.date,
          },
          end: {
            dateTime: item.end.dateTime ?? '',
            date: item.end.date,
          },
        }));
    })
  );

  return sortCalendarEvents(responses.flat());
}