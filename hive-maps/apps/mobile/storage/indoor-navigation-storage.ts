import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESSIBLE_TOGGLE_KEY = 'settings.accessible';

export async function loadAccessibleState(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(ACCESSIBLE_TOGGLE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

export async function saveAccessibleState(accessible: boolean) {
  try {
    await AsyncStorage.setItem(ACCESSIBLE_TOGGLE_KEY, accessible ? "true" : "false");
  } catch {
    /* ignore write failure */
  }
}