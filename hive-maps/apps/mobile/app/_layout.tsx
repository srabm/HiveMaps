import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Clarity from '@microsoft/react-native-clarity';
import Constants from 'expo-constants';
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
    const envProjectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID ?? '';
    const extraProjectId = Constants.expoConfig?.extra?.clarityProjectId ?? '';
    const clarityProjectId = envProjectId || extraProjectId;

    if (typeof clarityProjectId !== 'string' || clarityProjectId === 'YOUR_CLARITY_PROJECT_ID') {
      return;
    }

    Clarity.initialize(clarityProjectId);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
