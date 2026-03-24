import {
  fetchGoogleCalendars,
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
});
