import * as SecureStore from 'expo-secure-store';

import {
  clearGoogleCalendarSelection,
  clearGoogleCalendarSession,
  loadGoogleCalendarSelection,
  loadGoogleCalendarSession,
  saveGoogleCalendarSelection,
  saveGoogleCalendarSession,
} from '@/storage/auth-storage';

const mockGetItemAsync = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSetItemAsync = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('auth-storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
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
    const error = new Error('read failed');
    mockGetItemAsync.mockRejectedValueOnce(error);

    await expect(loadGoogleCalendarSession()).resolves.toBeNull();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore read failed for auth.googleCalendar.session',
      error
    );
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
    const error = new Error('write failed');
    mockSetItemAsync.mockRejectedValueOnce(error);

    await expect(
      saveGoogleCalendarSession({
        accessToken: 'token',
        obtainedAt: 123,
      })
    ).resolves.toBeUndefined();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore write failed for auth.googleCalendar.session',
      error
    );
  });

  it('clears the stored session', async () => {
    await clearGoogleCalendarSession();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth.googleCalendar.session');
  });

  it('ignores secure storage delete failures', async () => {
    const error = new Error('delete failed');
    mockDeleteItemAsync.mockRejectedValueOnce(error);

    await expect(clearGoogleCalendarSession()).resolves.toBeUndefined();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore delete failed for auth.googleCalendar.session',
      error
    );
  });

  it('loads a stored calendar selection', async () => {
    mockGetItemAsync.mockResolvedValueOnce(
      JSON.stringify({
        selectedCalendarIds: ['primary-calendar', 'classes-calendar'],
      })
    );

    await expect(loadGoogleCalendarSelection()).resolves.toEqual({
      selectedCalendarIds: ['primary-calendar', 'classes-calendar'],
    });
  });

  it('returns null and warns when calendar selection read fails', async () => {
    const error = new Error('selection read failed');
    mockGetItemAsync.mockRejectedValueOnce(error);

    await expect(loadGoogleCalendarSelection()).resolves.toBeNull();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore read failed for auth.googleCalendar.selection',
      error
    );
  });

  it('saves the selected calendar ids', async () => {
    const selection = {
      selectedCalendarIds: ['primary-calendar'],
    };

    await saveGoogleCalendarSelection(selection);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      'auth.googleCalendar.selection',
      JSON.stringify(selection)
    );
  });

  it('clears the stored calendar selection', async () => {
    await clearGoogleCalendarSelection();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth.googleCalendar.selection');
  });

  it('warns when saving the calendar selection fails', async () => {
    const error = new Error('selection write failed');
    mockSetItemAsync.mockRejectedValueOnce(error);

    await expect(
      saveGoogleCalendarSelection({
        selectedCalendarIds: ['primary-calendar'],
      })
    ).resolves.toBeUndefined();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore write failed for auth.googleCalendar.selection',
      error
    );
  });

  it('warns when clearing the calendar selection fails', async () => {
    const error = new Error('selection delete failed');
    mockDeleteItemAsync.mockRejectedValueOnce(error);

    await expect(clearGoogleCalendarSelection()).resolves.toBeUndefined();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[auth-storage] SecureStore delete failed for auth.googleCalendar.selection',
      error
    );
  });
});
