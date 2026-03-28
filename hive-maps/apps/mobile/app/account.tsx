import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleCalendarAuth } from '@/hooks/use-google-calendar-auth';

const CONCORDIA_CALENDAR_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/visual-schedule-builder-e/nbapggbchldhdjckbhdhkhlodokjdoha';

function getStatusLabel(status: ReturnType<typeof useGoogleCalendarAuth>['status']) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Securing session...';
    case 'prompting':
      return 'Waiting for Google consent...';
    case 'loading':
      return 'Checking connection...';
    case 'error':
      return 'Action required';
    default:
      return 'Not connected';
  }
}

export default function AccountScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const {
    calendarError,
    calendarStatus,
    calendars,
    connect,
    disconnect,
    error,
    isConfigured,
    isReady,
    refreshCalendars,
    selectedCalendarIds,
    session,
    status,
    toggleCalendarSelection,
  } = useGoogleCalendarAuth();

  const isBusy = status === 'loading' || status === 'connecting' || status === 'prompting';
  const isDisconnected = !session;
  const helperMessage = session
    ? 'Google Calendar successfully linked. Hive Maps can now use your schedule.'
    : isConfigured
      ? 'Google Calendar is not connected. Link your account to let Hive Maps use your schedule.'
      : 'Google Sign-In must be configured with both Android and Web OAuth client IDs. The Android client must match this package name and SHA-1, then the app must be rebuilt as a development build.';

  const openConcordiaCalendarExtension = async () => {
    try {
      await Linking.openURL(CONCORDIA_CALENDAR_EXTENSION_URL);
    } catch (error: unknown) {
      console.warn('[account] Failed to open Concordia calendar extension link', error);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colorScheme === 'dark' ? '#1f2933' : '#f4efe4' }]}>
          <ThemedText type="title" style={styles.title}>
            Account
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Connect Google Calendar so Hive Maps can use your class schedule.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: theme.icon }]}>
          <ThemedText type="subtitle">Google Calendar</ThemedText>
          <ThemedText style={styles.statusText}>Status: {getStatusLabel(status)}</ThemedText>
          {session?.email ? <ThemedText>{session.email}</ThemedText> : null}
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          <ThemedText style={styles.helperText}>{helperMessage}</ThemedText>
          {isDisconnected ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy || !isConfigured || !isReady}
              onPress={connect}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.tint, opacity: isBusy || !isConfigured || !isReady ? 0.6 : 1 },
              ]}>
              <ThemedText style={styles.primaryButtonText}>Connect Google Calendar</ThemedText>
            </Pressable>
          ) : null}

          {session ? (
            <Pressable
              accessibilityRole="button"
              onPress={disconnect}
              style={[styles.secondaryButton, { borderColor: theme.icon }]}>
              <ThemedText style={styles.secondaryButtonText}>Disconnect</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {session ? (
          <View style={[styles.card, { borderColor: theme.icon }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="subtitle">Course Schedule Calendars</ThemedText>
                <ThemedText style={styles.helperText}>
                  Choose which calendars Hive Maps can use when looking for your next class.
                </ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={calendarStatus === 'loading'}
                onPress={refreshCalendars}
                style={[
                  styles.refreshButton,
                  { borderColor: theme.icon, opacity: calendarStatus === 'loading' ? 0.6 : 1 },
                ]}>
                <ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
              </Pressable>
            </View>

            {calendarStatus === 'loading' ? (
              <ThemedText>Loading calendars...</ThemedText>
            ) : null}

            {calendarError ? <ThemedText style={styles.errorText}>{calendarError}</ThemedText> : null}

            {calendarStatus === 'loaded' && calendars.length === 0 ? (
              <ThemedText>No calendars were found for this Google account.</ThemedText>
            ) : null}

            {calendars.map((calendar) => {
              const selected = selectedCalendarIds.includes(calendar.id);

              return (
                <Pressable
                  key={calendar.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleCalendarSelection(calendar.id)}
                  style={[
                    styles.calendarRow,
                    {
                      borderColor: selected ? theme.tint : theme.icon,
                      backgroundColor: colorScheme === 'dark' ? '#1c1f24' : '#faf7f2',
                    },
                  ]}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: selected ? theme.tint : theme.icon, backgroundColor: selected ? theme.tint : 'transparent' },
                    ]}>
                    {selected ? <ThemedText style={styles.checkboxLabel}>X</ThemedText> : null}
                  </View>

                  <View style={styles.calendarCopy}>
                    <ThemedText style={styles.calendarTitle}>
                      {calendar.summary}
                      {calendar.primary ? ' (Primary)' : ''}
                    </ThemedText>
                    {calendar.description ? (
                      <ThemedText style={styles.calendarDescription}>{calendar.description}</ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            <ThemedText style={styles.linkPrompt}>
              Don&apos;t have your Concordia course schedule in Google Calendar yet?
            </ThemedText>
            <Pressable
              accessibilityRole="link"
              onPress={openConcordiaCalendarExtension}
              style={styles.inlineLink}>
              <ThemedText style={[styles.linkText, { color: theme.tint }]}>
                Export it with the Visual Schedule Builder extension
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  title: {
    fontFamily: Fonts.rounded,
    marginBottom: 8,
  },
  subtitle: {
    maxWidth: 420,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  helperText: {
    opacity: 0.8,
  },
  linkPrompt: {
    opacity: 0.85,
  },
  inlineLink: {
    alignSelf: 'flex-start',
  },
  linkText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#b42318',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  refreshButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshButtonText: {
    fontWeight: '600',
  },
  calendarRow: {
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarCopy: {
    flex: 1,
    gap: 4,
  },
  calendarTitle: {
    fontWeight: '700',
  },
  calendarDescription: {
    opacity: 0.75,
  },
});
