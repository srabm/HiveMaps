import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Clarity from '@microsoft/react-native-clarity';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const clarityProjectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID ?? '';
    if (!clarityProjectId) return;

    Clarity.initialize(clarityProjectId, {
      logLevel: Clarity.LogLevel.Verbose,
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
