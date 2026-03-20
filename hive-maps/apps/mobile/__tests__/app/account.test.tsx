import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import AccountScreen from '@/app/account';
import { useGoogleCalendarAuth } from '@/hooks/use-google-calendar-auth';

jest.mock('@/hooks/use-google-calendar-auth', () => ({
  useGoogleCalendarAuth: jest.fn(),
}));

const mockedUseGoogleCalendarAuth = useGoogleCalendarAuth as jest.MockedFunction<
  typeof useGoogleCalendarAuth
>;

describe('AccountScreen', () => {
  beforeEach(() => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      session: null,
      status: 'idle',
    });
  });

  it('renders the Google Calendar connect button', () => {
    const { getByText } = render(<AccountScreen />);

    expect(getByText('Connect Google Calendar')).toBeTruthy();
    expect(getByText('Status: Not connected')).toBeTruthy();
  });

  it('starts the Google connection flow from the button', () => {
    const connect = jest.fn();
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect,
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      session: null,
      status: 'idle',
    });

    const { getByText } = render(<AccountScreen />);
    fireEvent.press(getByText('Connect Google Calendar'));

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('shows the permission denied message from the auth hook', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      error:
        'Google Calendar permission was denied. Hive Maps cannot access your schedule unless you approve the request.',
      isConfigured: true,
      isReady: true,
      session: null,
      status: 'error',
    });

    const { getByText } = render(<AccountScreen />);

    expect(
      getByText(
        'Google Calendar permission was denied. Hive Maps cannot access your schedule unless you approve the request.'
      )
    ).toBeTruthy();
  });

  it('shows connected account details and a disconnect action', () => {
    const disconnect = jest.fn();
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect,
      error: null,
      isConfigured: true,
      isReady: true,
      session: {
        accessToken: 'token',
        email: 'student@example.edu',
        obtainedAt: Date.now(),
      },
      status: 'connected',
    });

    const { getByText, queryByText } = render(<AccountScreen />);

    expect(getByText('Status: Connected')).toBeTruthy();
    expect(getByText('student@example.edu')).toBeTruthy();
    expect(
      getByText('Google Calendar successfully linked. Hive Maps can now use your schedule.')
    ).toBeTruthy();
    expect(queryByText('Connect Google Calendar')).toBeNull();
    expect(
      queryByText(
        'Google Sign-In must be configured with both Android and Web OAuth client IDs. The Android client must match this package name and SHA-1, then the app must be rebuilt as a development build.'
      )
    ).toBeNull();

    fireEvent.press(getByText('Disconnect'));
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('renders the loading and prompting status labels while connect is unavailable', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: false,
      isReady: true,
      session: null,
      status: 'loading',
    });

    const { getByText, rerender } = render(<AccountScreen />);

    expect(getByText('Status: Checking connection...')).toBeTruthy();

    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: false,
      session: null,
      status: 'prompting',
    });

    rerender(<AccountScreen />);

    expect(getByText('Status: Waiting for Google consent...')).toBeTruthy();
  });

  it('renders the connecting status label', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      session: null,
      status: 'connecting',
    });

    const { getByText } = render(<AccountScreen />);

    expect(getByText('Status: Securing session...')).toBeTruthy();
  });
});
