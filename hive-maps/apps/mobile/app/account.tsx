import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleCalendarAuth } from '@/hooks/use-google-calendar-auth';

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
  const { connect, disconnect, error, isConfigured, isReady, session, status } = useGoogleCalendarAuth();

  const isBusy = status === 'loading' || status === 'connecting' || status === 'prompting';
  const isDisconnected = !session;
  const helperMessage = session
    ? 'Google Calendar successfully linked. Hive Maps can now use your schedule.'
    : isConfigured
      ? 'Google Calendar is not connected. Link your account to let Hive Maps use your schedule.'
      : 'Google Sign-In must be configured with both Android and Web OAuth client IDs. The Android client must match this package name and SHA-1, then the app must be rebuilt as a development build.';

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
  statusText: {
    fontWeight: '600',
  },
  helperText: {
    opacity: 0.8,
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
});
