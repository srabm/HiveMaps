import Constants from 'expo-constants';

import type { Building, CampusMeta } from '@/types/campus';

export type CampusResponse = CampusMeta;

export type BuildingResponse = Building;

// Prefer EXPO_PUBLIC_* env var so local .env can override app.json defaults
// (e.g. iOS simulator typically needs http://localhost:8080).
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const extraBaseUrl = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? '';
const baseUrl = envBaseUrl || extraBaseUrl || 'http://10.0.2.2:8080';

export function getApiBaseUrl() {
  return baseUrl;
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const hasAbortController = typeof AbortController === 'function';
  const controller = hasAbortController ? new AbortController() : null;
  const timeoutMs = 8000;
  const timeout =
    controller && typeof setTimeout !== 'undefined' ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const fetchPromise = fetch(url, controller ? { signal: controller.signal } : undefined);
    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs),
    );
    const res = (await Promise.race([fetchPromise, timeoutPromise])) as Response;
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchCampuses(): Promise<CampusResponse[]> {
  const campuses = await getJson<Array<{
    id: string;
    label: string;
    name: string;
    center: { lon: number; lat: number };
    zoom: number;
  }>>('/api/campuses');

  return campuses.map((campus) => ({
    id: campus.id,
    label: campus.label,
    name: campus.name,
    center: [campus.center.lon, campus.center.lat],
    zoom: campus.zoom,
  }));
}

export async function fetchBuildings(campus: string): Promise<BuildingResponse[]> {
  const buildings = await getJson<Array<{
    campus: string;
    code: string;
    name: string;
    location?: any;
    addresses: string[];
    center: { lon: number; lat: number };
    hasIndoorMap?: boolean;
  }>>(`/api/campuses/${campus}/buildings`);

  return buildings.map((building) => ({
    campus: building.campus,
    code: building.code,
    name: building.name,
    location: building.location,
    addresses: building.addresses,
    center: [building.center.lon, building.center.lat],
    hasIndoorMap: !!building.hasIndoorMap,
  }));
}

export async function searchPlaceByAddress(address: string){
  const refinedAddress = `${address}`;

  const res = await fetch(`${baseUrl}/api/places/search`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ address: refinedAddress }),
  });

  const data = await res.json();
  return data.placeId as string | null;
}

export async function fetchPlaceDetails(placeId: string){
  const res = await fetch(`${baseUrl}/api/places/${placeId}`);
  const data = await res.json();
  console.log('=== PLACE DETAILS RESPONSE ===');
  console.log('Place ID:', placeId);
  console.log('Full response:', JSON.stringify(data, null, 2));
  console.log('==============================');
  return data;
}
