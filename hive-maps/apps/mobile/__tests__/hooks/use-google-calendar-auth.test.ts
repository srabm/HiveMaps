import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signInSilently: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    revokeAccess: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    IN_PROGRESS: 'IN_PROGRESS',
  },
}));

jest.mock('@/storage/auth-storage', () => ({
  clearGoogleCalendarSelection: jest.fn(),
  loadGoogleCalendarSession: jest.fn(),
  loadGoogleCalendarSelection: jest.fn(),
  saveGoogleCalendarSession: jest.fn(),
  saveGoogleCalendarSelection: jest.fn(),
  clearGoogleCalendarSession: jest.fn(),
}));

jest.mock('@/services/google-calendar', () => ({
  fetchGoogleCalendars: jest.fn(),
  getDefaultSelectedCalendarIds: jest.fn(),
}));

jest.mock('@/hooks/google-calendar-auth-config', () => ({
  MISSING_GOOGLE_CLIENT_ID_MESSAGE:
    'Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the mobile .env file, then rebuild the app.',
  getGoogleCalendarAuthConfig: jest.fn(() => ({
    androidClientId: 'android.apps.googleusercontent.com',
    webClientId: 'web.apps.googleusercontent.com',
    debugSummary: {},
    errorMessage: null,
    isConfigured: true,
    configureOptions: {
      scopes: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
      webClientId: 'web.apps.googleusercontent.com',
    },
  })),
}));

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getGoogleCalendarAuthConfig } from '@/hooks/google-calendar-auth-config';
import {
  clearGoogleCalendarSelection,
  clearGoogleCalendarSession,
  loadGoogleCalendarSelection,
  loadGoogleCalendarSession,
  saveGoogleCalendarSelection,
  saveGoogleCalendarSession,
} from '@/storage/auth-storage';
import {
  fetchGoogleCalendars,
  getDefaultSelectedCalendarIds,
} from '@/services/google-calendar';
import { useGoogleCalendarAuth } from '@/hooks/use-google-calendar-auth';

const mockGetGoogleCalendarAuthConfig = getGoogleCalendarAuthConfig as jest.MockedFunction<
  typeof getGoogleCalendarAuthConfig
>;
const mockLoadGoogleCalendarSession = loadGoogleCalendarSession as jest.MockedFunction<
  typeof loadGoogleCalendarSession
>;
const mockSaveGoogleCalendarSession = saveGoogleCalendarSession as jest.MockedFunction<
  typeof saveGoogleCalendarSession
>;
const mockClearGoogleCalendarSession = clearGoogleCalendarSession as jest.MockedFunction<
  typeof clearGoogleCalendarSession
>;
const mockLoadGoogleCalendarSelection = loadGoogleCalendarSelection as jest.MockedFunction<
  typeof loadGoogleCalendarSelection
>;
const mockSaveGoogleCalendarSelection = saveGoogleCalendarSelection as jest.MockedFunction<
  typeof saveGoogleCalendarSelection
>;
const mockClearGoogleCalendarSelection = clearGoogleCalendarSelection as jest.MockedFunction<
  typeof clearGoogleCalendarSelection
>;
const mockFetchGoogleCalendars = fetchGoogleCalendars as jest.MockedFunction<typeof fetchGoogleCalendars>;
const mockGetDefaultSelectedCalendarIds = getDefaultSelectedCalendarIds as jest.MockedFunction<
  typeof getDefaultSelectedCalendarIds
>;
const mockConfigure = GoogleSignin.configure as jest.MockedFunction<typeof GoogleSignin.configure>;
const mockSignInSilently = GoogleSignin.signInSilently as jest.MockedFunction<
  typeof GoogleSignin.signInSilently
>;
const mockHasPlayServices = GoogleSignin.hasPlayServices as jest.MockedFunction<
  typeof GoogleSignin.hasPlayServices
>;
const mockSignIn = GoogleSignin.signIn as jest.MockedFunction<typeof GoogleSignin.signIn>;
const mockGetTokens = GoogleSignin.getTokens as jest.MockedFunction<typeof GoogleSignin.getTokens>;
const mockRevokeAccess = GoogleSignin.revokeAccess as jest.MockedFunction<
  typeof GoogleSignin.revokeAccess
>;
const mockSignOut = GoogleSignin.signOut as jest.MockedFunction<typeof GoogleSignin.signOut>;

type SignInResponse = Awaited<ReturnType<typeof GoogleSignin.signIn>>;
type SignInSilentlyResponse = Awaited<ReturnType<typeof GoogleSignin.signInSilently>>;
type SignInSuccessResponse = Extract<SignInResponse, { type: 'success' }>;
type NoSavedCredentialFoundResponse = Extract<SignInSilentlyResponse, { type: 'noSavedCredentialFound' }>;
type GoogleUser = SignInSuccessResponse['data'];
type GetTokensResponse = Awaited<ReturnType<typeof GoogleSignin.getTokens>>;

const debugSummary = {
  envVars: ['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'],
  hasAndroidClientId: true,
  hasWebClientId: true,
  isValid: true,
  maskedAndroidClientId: 'android....googleusercontent.com',
  maskedWebClientId: 'web....googleusercontent.com',
};

const configuredAuthConfig = {
  androidClientId: 'android.apps.googleusercontent.com',
  webClientId: 'web.apps.googleusercontent.com',
  debugSummary,
  errorMessage: null,
  isConfigured: true,
  configureOptions: {
    scopes: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'],
    webClientId: 'web.apps.googleusercontent.com',
  },
};

const availableCalendars = [
  { id: 'primary-calendar', summary: 'Personal', primary: true, description: null, backgroundColor: null },
  { id: 'classes-calendar', summary: 'Classes', primary: false, description: null, backgroundColor: null },
];

function makeUser(): GoogleUser {
  return {
    user: {
      id: 'user-123',
      name: 'Student',
      email: 'student@example.edu',
      photo: null,
      familyName: 'Example',
      givenName: 'Student',
    },
    scopes: ['email', 'profile'],
    idToken: 'id-token',
    serverAuthCode: null,
  };
}

function makeSignInSuccessResponse(): SignInSuccessResponse {
  return {
    type: 'success',
    data: makeUser(),
  };
}

function makeNoSavedCredentialFoundResponse(): NoSavedCredentialFoundResponse {
  return {
    type: 'noSavedCredentialFound',
    data: null,
  };
}

function makeTokens(): GetTokensResponse {
  return {
    accessToken: 'access-token',
    idToken: 'id-token',
  };
}

describe('useGoogleCalendarAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetGoogleCalendarAuthConfig.mockReturnValue(configuredAuthConfig);
    mockLoadGoogleCalendarSession.mockResolvedValue(null);
    mockLoadGoogleCalendarSelection.mockResolvedValue(null);
    mockSaveGoogleCalendarSession.mockResolvedValue(undefined);
    mockSaveGoogleCalendarSelection.mockResolvedValue(undefined);
    mockClearGoogleCalendarSelection.mockResolvedValue(undefined);
    mockClearGoogleCalendarSession.mockResolvedValue(undefined);
    mockFetchGoogleCalendars.mockResolvedValue(availableCalendars);
    mockGetDefaultSelectedCalendarIds.mockReturnValue(['primary-calendar']);

    mockSignInSilently.mockResolvedValue(makeNoSavedCredentialFoundResponse());
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockResolvedValue(makeSignInSuccessResponse());
    mockGetTokens.mockResolvedValue(makeTokens());
    mockRevokeAccess.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(null);
  });

  it('restores a silently signed-in session on mount', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(mockSaveGoogleCalendarSession).toHaveBeenCalledTimes(1);
    expect(mockFetchGoogleCalendars).toHaveBeenCalledWith('access-token');
    expect(result.current.calendars).toEqual(availableCalendars);
    expect(result.current.selectedCalendarIds).toEqual(['primary-calendar']);
    expect(result.current.session?.email).toBe('student@example.edu');
    expect(result.current.error).toBeNull();
  });

  it('returns to idle and clears stale session data when silent sign-in is unavailable', async () => {
    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    expect(mockClearGoogleCalendarSession).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
    expect(result.current.calendars).toEqual([]);
  });

  it('clears the stored session when silent sign-in reports credentials are required', async () => {
    mockLoadGoogleCalendarSession.mockResolvedValue({
      accessToken: 'stored-token',
      email: 'student@example.edu',
      obtainedAt: 123,
    });
    mockSignInSilently.mockRejectedValueOnce({
      code: 'SIGN_IN_REQUIRED',
      message: 'Sign in required',
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    expect(mockClearGoogleCalendarSession).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
  });

  it('preserves a stored session when silent sign-in fails with a transient error', async () => {
    mockLoadGoogleCalendarSession.mockResolvedValue({
      accessToken: 'stored-token',
      email: 'student@example.edu',
      obtainedAt: 123,
    });
    mockSignInSilently.mockRejectedValueOnce(new Error('network unavailable'));

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(mockClearGoogleCalendarSession).not.toHaveBeenCalled();
    expect(result.current.session?.email).toBe('student@example.edu');
    expect(result.current.error).toBe('network unavailable');
  });

  it('surfaces a configuration error before attempting sign-in', async () => {
    mockGetGoogleCalendarAuthConfig.mockReturnValue({
      ...configuredAuthConfig,
      errorMessage:
        'Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the mobile .env file, then rebuild the app.',
      isConfigured: false,
      configureOptions: { scopes: configuredAuthConfig.configureOptions.scopes },
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(mockHasPlayServices).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/not configured/i);
  });

  it('maps non-recoverable sign-in failures to the setup guidance', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('A non-recoverable sign in failure occurred'));

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/misconfigured/i);
  });

  it('maps a cancelled interactive sign-in to a permission error', async () => {
    mockSignIn.mockRejectedValueOnce({
      code: 'SIGN_IN_CANCELLED',
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(mockGetTokens).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/permission was denied/i);
  });

  it('returns to idle when silent sign-in throws during startup without a stored session', async () => {
    mockSignInSilently.mockRejectedValueOnce(new Error('silent sign-in failed'));

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    expect(mockClearGoogleCalendarSession).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('silent sign-in failed');
  });

  it('keeps an existing session connected when play services are unavailable', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockHasPlayServices.mockRejectedValueOnce({
      code: 'PLAY_SERVICES_NOT_AVAILABLE',
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBe('Google Play Services is not available on this device.');
  });

  it('keeps an existing session connected when the interactive sign-in result is cancelled', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockSignIn.mockResolvedValueOnce({
      type: 'cancelled',
      data: null,
    } as SignInResponse);

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(async () => {
      await result.current.connect();
    });

    expect(mockGetTokens).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toMatch(/permission was denied/i);
  });

  it('surfaces the in-progress message for overlapping sign-in attempts', async () => {
    mockSignIn.mockRejectedValueOnce({
      code: 'IN_PROGRESS',
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Google sign-in is already in progress.');
  });

  it('falls back to a generic error for non-Error sign-in failures', async () => {
    mockSignIn.mockRejectedValueOnce('unexpected failure');

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Google sign-in failed while securing your session.');
  });

  it('stores the session after a successful interactive sign-in', async () => {
    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.connect();
    });

    expect(mockHasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(mockSaveGoogleCalendarSession).toHaveBeenCalledTimes(1);
    expect(mockSaveGoogleCalendarSelection).toHaveBeenCalledWith({
      selectedCalendarIds: ['primary-calendar'],
    });
    expect(result.current.status).toBe('connected');
    expect(result.current.session?.email).toBe('student@example.edu');
  });

  it('restores a saved calendar selection when those calendars still exist', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockLoadGoogleCalendarSelection.mockResolvedValue({
      selectedCalendarIds: ['classes-calendar'],
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(result.current.selectedCalendarIds).toEqual(['classes-calendar']);
    expect(mockGetDefaultSelectedCalendarIds).not.toHaveBeenCalled();
  });

  it('falls back to the default calendar selection when the stored selection is stale', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockLoadGoogleCalendarSelection.mockResolvedValue({
      selectedCalendarIds: ['missing-calendar'],
    });

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(mockGetDefaultSelectedCalendarIds).toHaveBeenCalledWith(availableCalendars);
    expect(result.current.selectedCalendarIds).toEqual(['primary-calendar']);
  });

  it('toggles selected calendars while keeping at least one calendar selected', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(async () => {
      await result.current.toggleCalendarSelection('classes-calendar');
    });

    expect(result.current.selectedCalendarIds).toEqual(['primary-calendar', 'classes-calendar']);

    await act(async () => {
      await result.current.toggleCalendarSelection('primary-calendar');
    });

    expect(result.current.selectedCalendarIds).toEqual(['classes-calendar']);

    await act(async () => {
      await result.current.toggleCalendarSelection('classes-calendar');
    });

    expect(result.current.selectedCalendarIds).toEqual(['classes-calendar']);
  });

  it('surfaces a calendar sync error when loading calendars fails', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockFetchGoogleCalendars.mockRejectedValueOnce(new Error('Calendar API unavailable'));

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(result.current.calendarStatus).toBe('error');
    expect(result.current.calendarError).toBe('Calendar API unavailable');
    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarIds).toEqual([]);
  });

  it('uses the generic calendar error when loading calendars fails with a non-Error value', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockFetchGoogleCalendars.mockRejectedValueOnce('bad response');

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    expect(result.current.calendarStatus).toBe('error');
    expect(result.current.calendarError).toBe('Unable to load Google Calendars right now.');
  });

  it('resets calendar state when refresh is requested without a session', async () => {
    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await result.current.refreshCalendars();
    });

    expect(mockFetchGoogleCalendars).not.toHaveBeenCalled();
    expect(result.current.calendarStatus).toBe('idle');
    expect(result.current.calendarError).toBeNull();
    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarIds).toEqual([]);
  });

  it('clears the local session on disconnect even when revoke access fails', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());
    mockRevokeAccess.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(mockClearGoogleCalendarSelection).toHaveBeenCalled();
    expect(mockClearGoogleCalendarSession).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
    expect(result.current.selectedCalendarIds).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('signs out cleanly when revoke access succeeds', async () => {
    mockSignInSilently.mockResolvedValue(makeSignInSuccessResponse());

    const { result } = renderHook(() => useGoogleCalendarAuth());

    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(mockRevokeAccess).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });
});
