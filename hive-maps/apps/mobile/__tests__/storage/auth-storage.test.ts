import * as SecureStore from 'expo-secure-store';

import {
  clearGoogleCalendarSession,
  loadGoogleCalendarSession,
  saveGoogleCalendarSession,
} from '@/storage/auth-storage';

const mockGetItemAsync = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSetItemAsync = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

describe('auth-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads a stored Google Calendar session', async () => {
    mockGetItemAsync.mockResolvedValueOnce(
      JSON.stringify({
        accessToken: 'token',
        email: 'student@example.edu',
        obtainedAt: 123,
      })
    );

    await expect(loadGoogleCalendarSession()).resolves.toEqual({
      accessToken: 'token',
      email: 'student@example.edu',
      obtainedAt: 123,
    });
  });

  it('returns null when no stored session exists', async () => {
    mockGetItemAsync.mockResolvedValueOnce(null);

    await expect(loadGoogleCalendarSession()).resolves.toBeNull();
  });

  it('returns null when secure storage read fails', async () => {
    mockGetItemAsync.mockRejectedValueOnce(new Error('read failed'));

    await expect(loadGoogleCalendarSession()).resolves.toBeNull();
  });

  it('saves the session payload to secure storage', async () => {
    const session = {
      accessToken: 'token',
      email: 'student@example.edu',
      obtainedAt: 123,
    };

    await saveGoogleCalendarSession(session);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      'auth.googleCalendar.session',
      JSON.stringify(session)
    );
  });

  it('ignores secure storage write failures', async () => {
    mockSetItemAsync.mockRejectedValueOnce(new Error('write failed'));

    await expect(
      saveGoogleCalendarSession({
        accessToken: 'token',
        obtainedAt: 123,
      })
    ).resolves.toBeUndefined();
  });

  it('clears the stored session', async () => {
    await clearGoogleCalendarSession();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth.googleCalendar.session');
  });

  it('ignores secure storage delete failures', async () => {
    mockDeleteItemAsync.mockRejectedValueOnce(new Error('delete failed'));

    await expect(clearGoogleCalendarSession()).resolves.toBeUndefined();
  });
});
