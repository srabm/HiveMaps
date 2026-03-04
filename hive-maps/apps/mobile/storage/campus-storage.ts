import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CampusId } from '@/types/campus';

const CAMPUS_KEY = 'settings.selectedCampus';
const BUILDING_CACHE_KEY = 'data.buildingCoordinates';
const DETAILS_CACHE_KEY = 'data.placeDetails';

export type BuildingCoordinateCache = Record<string, [number, number]>;

export async function loadSelectedCampus(): Promise<CampusId | null> {
  try {
    const stored = await AsyncStorage.getItem(CAMPUS_KEY);
    if (stored?.trim()) return stored;
  } catch {
    /* ignore and fall back */
  }
  return null;
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

export type PlaceDetailsCache = Record<string, any>;

export async function loadDetailsCache(): Promise<PlaceDetailsCache> {
  try {
    const raw = await AsyncStorage.getItem(DETAILS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function mergeDetailsCache(update: PlaceDetailsCache) {
  const existing = await loadDetailsCache();
  const merged = {...existing, ...update};
  try {
    await AsyncStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to save details cache", e);
  }
}
