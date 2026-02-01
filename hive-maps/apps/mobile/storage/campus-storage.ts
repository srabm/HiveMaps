import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CampusId } from '@/constants/campus';

const CAMPUS_KEY = 'settings.selectedCampus';
const BUILDING_CACHE_KEY = 'data.buildingCoordinates';

export type BuildingCoordinateCache = Record<string, [number, number]>;

export async function loadSelectedCampus(): Promise<CampusId> {
  try {
    const stored = await AsyncStorage.getItem(CAMPUS_KEY);
    if (stored === 'SGW' || stored === 'LOY') return stored;
  } catch {
    /* ignore and fall back */
  }
  return 'SGW';
}

export async function saveSelectedCampus(campus: CampusId) {
  try {
    await AsyncStorage.setItem(CAMPUS_KEY, campus);
  } catch {
    /* ignore write failure */
  }
}

export async function loadBuildingCache(): Promise<BuildingCoordinateCache> {
  try {
    const raw = await AsyncStorage.getItem(BUILDING_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function mergeBuildingCache(update: BuildingCoordinateCache) {
  const existing = await loadBuildingCache();
  const merged = { ...existing, ...update };
  try {
    await AsyncStorage.setItem(BUILDING_CACHE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore write failure */
  }
  return merged;
}
