import {
  GOOGLE_SCOPES,
  INVALID_GOOGLE_CLIENT_ID_MESSAGE,
  MISSING_GOOGLE_CLIENT_ID_MESSAGE,
  getGoogleCalendarAuthConfig,
} from '@/hooks/google-calendar-auth-config';

describe('getGoogleCalendarAuthConfig', () => {
  it('uses the Android and Web client ids from the env file when present', () => {
    const config = getGoogleCalendarAuthConfig({
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'android-client-id.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client-id.apps.googleusercontent.com',
    });
    console.info('google auth config', config.debugSummary);

    expect(config.isConfigured).toBe(true);
    expect(config.androidClientId).toBe('android-client-id.apps.googleusercontent.com');
    expect(config.webClientId).toBe('web-client-id.apps.googleusercontent.com');
    expect(config.configureOptions).toEqual({
      scopes: GOOGLE_SCOPES,
      webClientId: 'web-client-id.apps.googleusercontent.com',
    });
  });

  it('rejects an invalid Android client id format', () => {
    const config = getGoogleCalendarAuthConfig({
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'not-a-google-client-id',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client-id.apps.googleusercontent.com',
    });
    console.info('google auth config', config.debugSummary);

    expect(config.isConfigured).toBe(false);
    expect(config.errorMessage).toBe(INVALID_GOOGLE_CLIENT_ID_MESSAGE);
    expect(config.configureOptions).toEqual({
      scopes: GOOGLE_SCOPES,
    });
  });

  it('requires a valid web client id instead of reusing the Android env var', () => {
    const config = getGoogleCalendarAuthConfig({
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'android-client-id.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client-id.apps.googleusercontent.com',
    });

    expect(config.androidClientId).toBe('android-client-id.apps.googleusercontent.com');
    expect(config.webClientId).toBe('web-client-id.apps.googleusercontent.com');
    expect(config.configureOptions).toEqual({
      scopes: GOOGLE_SCOPES,
      webClientId: 'web-client-id.apps.googleusercontent.com',
    });
  });

  it('returns a clear error when no client ids are configured', () => {
    const config = getGoogleCalendarAuthConfig({});
    console.info('google auth config', config.debugSummary);

    expect(config.isConfigured).toBe(false);
    expect(config.errorMessage).toBe(MISSING_GOOGLE_CLIENT_ID_MESSAGE);
    expect(config.configureOptions).toEqual({
      scopes: GOOGLE_SCOPES,
    });
  });

  it('returns a clear error when the web client id is missing', () => {
    const config = getGoogleCalendarAuthConfig({
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'android-client-id.apps.googleusercontent.com',
    });

    expect(config.isConfigured).toBe(false);
    expect(config.errorMessage).toBe(MISSING_GOOGLE_CLIENT_ID_MESSAGE);
  });
});
