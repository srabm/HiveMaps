import {
  fetchGoogleCalendars,
  fetchUpcomingGoogleCalendarEvents,
  getDefaultSelectedCalendarIds,
} from '@/services/google-calendar';

describe('google-calendar service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('fetches and sorts calendars with the primary calendar first', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 'work', summary: 'Work' },
          { id: 'primary', summary: 'Personal', primary: true },
          { id: 'classes', summary: 'Classes' },
        ],
      }),
    });

    await expect(fetchGoogleCalendars('token')).resolves.toEqual([
      { id: 'primary', summary: 'Personal', description: null, primary: true, backgroundColor: null },
      { id: 'classes', summary: 'Classes', description: null, primary: false, backgroundColor: null },
      { id: 'work', summary: 'Work', description: null, primary: false, backgroundColor: null },
    ]);
  });

  it('throws a stable error when the API request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    await expect(fetchGoogleCalendars('token')).rejects.toThrow(
      'Unable to load Google Calendars right now.'
    );
  });

  it('defaults selection to the primary calendar when one exists', () => {
    expect(
      getDefaultSelectedCalendarIds([
        { id: 'classes', summary: 'Classes', primary: false },
        { id: 'primary', summary: 'Personal', primary: true },
      ])
    ).toEqual(['primary']);
  });
  it('fetches and sorts upcoming events across selected calendars', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
          id: 'later',
          summary: 'COMP 472 Lecture',
          location: 'H-920',
          start: {dateTime: '2025-01-15T10:30:00.000Z'},
          end: {dateTime: '2025-01-15T11:45:00.000Z'},
          },
        ],
      }),
    })

    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'soon',
            summary: 'SOEN 341 Tutorial',
            location: 'MB-3.255',
            start: {dateTime: '2025-01-15T09:30:00.000Z'},
            end: {dateTime: '2025-01-15T10:20:00.000Z'},
          },
        ],
      }),
    });

    await expect(
      fetchUpcomingGoogleCalendarEvents(
        'token',
        ['calendar-a', 'calendar-b'],
        new Date('2025-01-15T09:00:00.000Z')
      )
    ).resolves.toEqual([
      {
        id: 'soon',
        summary: 'SOEN 341 Tutorial',
        location: 'MB-3.255',
        start: {dateTime: '2025-01-15T09:30:00.000Z', date: undefined},
        end: {dateTime: '2025-01-15T10:20:00.000Z', date: undefined},
      },
      {
        id: 'later',
        summary: 'COMP 472 Lecture',
        location: 'H-920',
        start: {dateTime: '2025-01-15T10:30:00.000Z', date: undefined},
        end: {dateTime: '2025-01-15T11:45:00.000Z', date: undefined},
      },
    ]);
  });
  it('throws an error when the events API request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    await expect(
      fetchUpcomingGoogleCalendarEvents(
        'token',
        ['calendar-a'],
        new Date('2025-01-15T09:00:00.000Z')
      )
    ).rejects.toThrow('Unable to load Google Calendar events right now.');
  });
});
