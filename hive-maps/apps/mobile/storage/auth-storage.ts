import * as SecureStore from 'expo-secure-store';

const GOOGLE_AUTH_SESSION_KEY = 'auth.googleCalendar.session';
const GOOGLE_CALENDAR_SELECTION_KEY = 'auth.googleCalendar.selection';

function logSecureStoreFailure(operation: 'read' | 'write' | 'delete', key: string, error: unknown) {
  console.warn(`[auth-storage] SecureStore ${operation} failed for ${key}`, error);
}

export type GoogleCalendarSession = {
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
  tokenType?: string | null;
  expiresIn?: number | null;
  scope?: string | null;
  obtainedAt: number;
  email?: string | null;
  name?: string | null;
};

export type GoogleCalendarSelection = {
  selectedCalendarIds: string[];
};

export async function loadGoogleCalendarSession(): Promise<GoogleCalendarSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(GOOGLE_AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as GoogleCalendarSession) : null;
  } catch (error: unknown) {
    logSecureStoreFailure('read', GOOGLE_AUTH_SESSION_KEY, error);
    return null;
  }
}

export async function saveGoogleCalendarSession(session: GoogleCalendarSession) {
  try {
    await SecureStore.setItemAsync(GOOGLE_AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (error: unknown) {
    logSecureStoreFailure('write', GOOGLE_AUTH_SESSION_KEY, error);
  }
}

export async function clearGoogleCalendarSession() {
  try {
    await SecureStore.deleteItemAsync(GOOGLE_AUTH_SESSION_KEY);
  } catch (error: unknown) {
    logSecureStoreFailure('delete', GOOGLE_AUTH_SESSION_KEY, error);
  }
}

export async function loadGoogleCalendarSelection(): Promise<GoogleCalendarSelection | null> {
  try {
    const raw = await SecureStore.getItemAsync(GOOGLE_CALENDAR_SELECTION_KEY);
    return raw ? (JSON.parse(raw) as GoogleCalendarSelection) : null;
  } catch (error: unknown) {
    logSecureStoreFailure('read', GOOGLE_CALENDAR_SELECTION_KEY, error);
    return null;
  }
}

export async function saveGoogleCalendarSelection(selection: GoogleCalendarSelection) {
  try {
    await SecureStore.setItemAsync(GOOGLE_CALENDAR_SELECTION_KEY, JSON.stringify(selection));
  } catch (error: unknown) {
    logSecureStoreFailure('write', GOOGLE_CALENDAR_SELECTION_KEY, error);
  }
}

export async function clearGoogleCalendarSelection() {
  try {
    await SecureStore.deleteItemAsync(GOOGLE_CALENDAR_SELECTION_KEY);
  } catch (error: unknown) {
    logSecureStoreFailure('delete', GOOGLE_CALENDAR_SELECTION_KEY, error);
  }
}
