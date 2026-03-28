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
