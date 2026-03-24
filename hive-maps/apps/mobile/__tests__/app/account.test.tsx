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
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'idle',
      toggleCalendarSelection: jest.fn(),
    });
  });

  it('renders the Google Calendar connect button', () => {
    const { getByText } = render(<AccountScreen />);

    expect(getByText('Connect Google Calendar')).toBeTruthy();
    expect(getByText('Status: Not connected')).toBeTruthy();
    expect(
      getByText('Google Calendar is not connected. Link your account to let Hive Maps use your schedule.')
    ).toBeTruthy();
  });

  it('starts the Google connection flow from the button', () => {
    const connect = jest.fn();
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect,
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'idle',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText } = render(<AccountScreen />);
    fireEvent.press(getByText('Connect Google Calendar'));

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('shows the permission denied message from the auth hook', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error:
        'Google Calendar permission was denied. Hive Maps cannot access your schedule unless you approve the request.',
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'error',
      toggleCalendarSelection: jest.fn(),
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
    const refreshCalendars = jest.fn();
    const toggleCalendarSelection = jest.fn();
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'loaded',
      calendars: [
        {
          id: 'primary-calendar',
          summary: 'Personal',
          primary: true,
          description: null,
          backgroundColor: null,
        },
        {
          id: 'classes-calendar',
          summary: 'Classes',
          primary: false,
          description: 'Concordia schedule',
          backgroundColor: null,
        },
      ],
      connect: jest.fn(),
      disconnect,
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars,
      selectedCalendarIds: ['classes-calendar'],
      session: {
        accessToken: 'token',
        email: 'student@example.edu',
        obtainedAt: Date.now(),
      },
      status: 'connected',
      toggleCalendarSelection,
    });

    const { getByRole, getByText, queryByText } = render(<AccountScreen />);

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
    expect(getByText('Course Schedule Calendars')).toBeTruthy();
    expect(getByText('Personal (Primary)')).toBeTruthy();
    expect(getByText('Classes')).toBeTruthy();
    expect(getByText('Concordia schedule')).toBeTruthy();

    fireEvent.press(getByText('Disconnect'));
    expect(disconnect).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Refresh'));
    expect(refreshCalendars).toHaveBeenCalledTimes(1);

    fireEvent.press(getByRole('checkbox', { name: 'Classes' }));
    expect(toggleCalendarSelection).toHaveBeenCalledWith('classes-calendar');
  });

  it('renders the loading and prompting status labels while connect is unavailable', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: false,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'loading',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText, rerender } = render(<AccountScreen />);

    expect(getByText('Status: Checking connection...')).toBeTruthy();

    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: false,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'prompting',
      toggleCalendarSelection: jest.fn(),
    });

    rerender(<AccountScreen />);

    expect(getByText('Status: Waiting for Google consent...')).toBeTruthy();
  });

  it('shows setup guidance when Google Sign-In is not configured', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: false,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'idle',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText } = render(<AccountScreen />);

    expect(
      getByText(
        'Google Sign-In must be configured with both Android and Web OAuth client IDs. The Android client must match this package name and SHA-1, then the app must be rebuilt as a development build.'
      )
    ).toBeTruthy();
  });

  it('renders the connecting status label', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'idle',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: null,
      status: 'connecting',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText } = render(<AccountScreen />);

    expect(getByText('Status: Securing session...')).toBeTruthy();
  });

  it('shows loading and error states for the calendar section', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: 'Unable to load Google Calendars right now.',
      calendarStatus: 'loading',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: {
        accessToken: 'token',
        email: 'student@example.edu',
        obtainedAt: Date.now(),
      },
      status: 'connected',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText } = render(<AccountScreen />);

    expect(getByText('Loading calendars...')).toBeTruthy();
    expect(getByText('Unable to load Google Calendars right now.')).toBeTruthy();
  });

  it('shows the empty state when no calendars are available for a connected account', () => {
    mockedUseGoogleCalendarAuth.mockReturnValue({
      calendarError: null,
      calendarStatus: 'loaded',
      calendars: [],
      connect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      isConfigured: true,
      isReady: true,
      refreshCalendars: jest.fn(),
      selectedCalendarIds: [],
      session: {
        accessToken: 'token',
        email: 'student@example.edu',
        obtainedAt: Date.now(),
      },
      status: 'connected',
      toggleCalendarSelection: jest.fn(),
    });

    const { getByText } = render(<AccountScreen />);

    expect(getByText('No calendars were found for this Google account.')).toBeTruthy();
  });
});
