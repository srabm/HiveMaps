import { useEffect, useState } from 'react';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import {
  MISSING_GOOGLE_CLIENT_ID_MESSAGE,
  getGoogleCalendarAuthConfig,
} from '@/hooks/google-calendar-auth-config';
import {
  clearGoogleCalendarSelection,
  clearGoogleCalendarSession,
  loadGoogleCalendarSelection,
  loadGoogleCalendarSession,
  saveGoogleCalendarSelection,
  saveGoogleCalendarSession,
  type GoogleCalendarSession,
} from '@/storage/auth-storage';
import {
  fetchGoogleCalendars,
  getDefaultSelectedCalendarIds,
  type GoogleCalendar,
} from '@/services/google-calendar';

const PERMISSION_DENIED_MESSAGE =
  'Google Calendar permission was denied. Hive Maps cannot access your schedule unless you approve the request.';
const GOOGLE_SIGN_IN_MISCONFIGURED_MESSAGE =
  'Google Sign-In is misconfigured. Confirm the Android OAuth client matches com.anonymous.mobile and your app signing SHA-1, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the OAuth Web client id, then rebuild the app.';

type AuthStatus = 'idle' | 'loading' | 'prompting' | 'connecting' | 'connected' | 'error';
type CalendarStatus = 'idle' | 'loading' | 'loaded' | 'error';

GoogleSignin.configure(getGoogleCalendarAuthConfig().configureOptions);

type GoogleTokens = {
  accessToken: string;
  idToken?: string | null;
};

type GoogleUserData = {
  scopes: string[];
  user: {
    email?: string | null;
    name?: string | null;
  };
};

function buildGoogleCalendarSession(data: GoogleUserData, tokens: GoogleTokens): GoogleCalendarSession {
  return {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    scope: data.scopes.join(' '),
    obtainedAt: Date.now(),
    email: data.user.email,
    name: data.user.name,
  };
}

function getErrorStatus(currentSession: GoogleCalendarSession | null): AuthStatus {
  return currentSession ? 'connected' : 'error';
}

function shouldClearSessionForSilentSignInFailure(signInError: unknown) {
  const code =
    typeof signInError === 'object' && signInError && 'code' in signInError
      ? String(signInError.code)
      : '';
  const message = signInError instanceof Error ? signInError.message : '';
  const normalizedError = `${code} ${message}`.toUpperCase();

  return normalizedError.includes('SIGN_IN_REQUIRED') || normalizedError.includes('NO_SAVED_CREDENTIAL');
}

function getGoogleSignInErrorMessage(signInError: unknown) {
  const code =
    typeof signInError === 'object' && signInError && 'code' in signInError
      ? String(signInError.code)
      : '';
  const message = signInError instanceof Error ? signInError.message : '';
  const normalizedError = `${code} ${message}`.toUpperCase();

  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return PERMISSION_DENIED_MESSAGE;
  }

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is not available on this device.';
  }

  if (code === statusCodes.IN_PROGRESS) {
    return 'Google sign-in is already in progress.';
  }

  const isMisconfiguredError =
    normalizedError.includes('DEVELOPER_ERROR') ||
    normalizedError.includes('SIGN_IN_FAILED') ||
    normalizedError.includes('NON-RECOVERABLE');

  if (isMisconfiguredError) {
    return GOOGLE_SIGN_IN_MISCONFIGURED_MESSAGE;
  }

  return signInError instanceof Error
    ? signInError.message
    : 'Google sign-in failed while securing your session.';
}

export function useGoogleCalendarAuth() {
  const [session, setSession] = useState<GoogleCalendarSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>('idle');
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  const syncCalendars = async (accessToken: string) => {
    setCalendarStatus('loading');
    setCalendarError(null);

    try {
      const [remoteCalendars, storedSelection] = await Promise.all([
        fetchGoogleCalendars(accessToken),
        loadGoogleCalendarSelection(),
      ]);

      const availableCalendarIds = new Set(remoteCalendars.map((calendar) => calendar.id));
      const persistedSelection = (storedSelection?.selectedCalendarIds ?? []).filter((calendarId) =>
        availableCalendarIds.has(calendarId)
      );
      const nextSelectedCalendarIds =
        persistedSelection.length > 0
          ? persistedSelection
          : getDefaultSelectedCalendarIds(remoteCalendars);

      setCalendars(remoteCalendars);
      setSelectedCalendarIds(nextSelectedCalendarIds);
      setCalendarStatus('loaded');

      await saveGoogleCalendarSelection({ selectedCalendarIds: nextSelectedCalendarIds });
    } catch (calendarLoadError: unknown) {
      setCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarStatus('error');
      setCalendarError(
        calendarLoadError instanceof Error
          ? calendarLoadError.message
          : 'Unable to load Google Calendars right now.'
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const storedSession = await loadGoogleCalendarSession();
      if (!mounted) return;

      setSession(storedSession);
      setError(null);

      try {
        const silentSignIn = await GoogleSignin.signInSilently();
        if (!mounted) return;

        if (silentSignIn.type === 'success') {
          const tokens = await GoogleSignin.getTokens();
          if (!mounted) return;

          const nextSession = buildGoogleCalendarSession(silentSignIn.data, tokens);

          await saveGoogleCalendarSession(nextSession);
          if (!mounted) return;

          setSession(nextSession);
          setStatus('connected');
          await syncCalendars(nextSession.accessToken);
          return;
        }
      } catch (signInError: unknown) {
        if (!mounted) return;

        if (shouldClearSessionForSilentSignInFailure(signInError)) {
          await clearGoogleCalendarSession();
          if (!mounted) return;

          setSession(null);
          setStatus('idle');
          return;
        }

        setError(getGoogleSignInErrorMessage(signInError));
        setStatus(storedSession ? 'connected' : 'idle');
        return;
      }

      await clearGoogleCalendarSession();
      if (!mounted) return;

      setSession(null);
      setStatus('idle');
      setCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarStatus('idle');
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const connect = async () => {
    const authConfig = getGoogleCalendarAuthConfig();

    if (!authConfig.isConfigured) {
      setError(authConfig.errorMessage ?? MISSING_GOOGLE_CLIENT_ID_MESSAGE);
      setStatus(getErrorStatus(session));
      return;
    }

    setError(null);
    setStatus('prompting');

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      setStatus('connecting');

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === 'cancelled') {
        setError(PERMISSION_DENIED_MESSAGE);
        setStatus(getErrorStatus(session));
        return;
      }

      const tokens = await GoogleSignin.getTokens();
      const nextSession = buildGoogleCalendarSession(signInResult.data, tokens);

      await saveGoogleCalendarSession(nextSession);
      setSession(nextSession);
      setStatus('connected');
      await syncCalendars(nextSession.accessToken);
    } catch (signInError: unknown) {
      setError(getGoogleSignInErrorMessage(signInError));
      setStatus(getErrorStatus(session));
    }
  };

  const disconnect = async () => {
    try {
      await GoogleSignin.revokeAccess();
    } catch {
      /* ignore revoke failures and continue clearing the native session */
    }

    try {
      await GoogleSignin.signOut();
    } catch {
      /* ignore sign-out failures and clear the local session anyway */
    }

    await clearGoogleCalendarSelection();
    await clearGoogleCalendarSession();
    setSession(null);
    setError(null);
    setStatus('idle');
    setCalendars([]);
    setSelectedCalendarIds([]);
    setCalendarError(null);
    setCalendarStatus('idle');
  };

  const toggleCalendarSelection = async (calendarId: string) => {
    const isSelected = selectedCalendarIds.includes(calendarId);
    if (isSelected && selectedCalendarIds.length === 1) {
      return;
    }

    const nextSelection = isSelected
      ? selectedCalendarIds.filter((selectedId) => selectedId !== calendarId)
      : [...selectedCalendarIds, calendarId];

    setSelectedCalendarIds(nextSelection);
    await saveGoogleCalendarSelection({ selectedCalendarIds: nextSelection });
  };

  const refreshCalendars = async () => {
    if (!session?.accessToken) {
      setCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarStatus('idle');
      setCalendarError(null);
      return;
    }

    await syncCalendars(session.accessToken);
  };

  return {
    calendarError,
    calendarStatus,
    calendars,
    connect,
    disconnect,
    error,
    isConfigured: getGoogleCalendarAuthConfig().isConfigured,
    isReady: true,
    refreshCalendars,
    selectedCalendarIds,
    session,
    status,
    toggleCalendarSelection,
  };
}
