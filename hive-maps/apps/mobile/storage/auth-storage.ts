import * as SecureStore from 'expo-secure-store';

const GOOGLE_AUTH_SESSION_KEY = 'auth.googleCalendar.session';

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

export async function loadGoogleCalendarSession(): Promise<GoogleCalendarSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(GOOGLE_AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as GoogleCalendarSession) : null;
  } catch {
    return null;
  }
}

export async function saveGoogleCalendarSession(session: GoogleCalendarSession) {
  try {
    await SecureStore.setItemAsync(GOOGLE_AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore secure storage write failure */
  }
}

export async function clearGoogleCalendarSession() {
  try {
    await SecureStore.deleteItemAsync(GOOGLE_AUTH_SESSION_KEY);
  } catch {
    /* ignore secure storage deletion failure */
  }
}
