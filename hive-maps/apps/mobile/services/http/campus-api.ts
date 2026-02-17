import Constants from 'expo-constants';

import { CampusId, type Building } from '@/constants/campus';

export type CampusResponse = {
  id: CampusId;
  label: string;
  name: string;
  center: { lon: number; lat: number };
  zoom: number;
};

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
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
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
  return getJson<CampusResponse[]>('/api/campuses');
}

export async function fetchBuildings(campus: CampusId): Promise<Building[]> {
  return getJson<Building[]>(`/api/campuses/${campus}/buildings`);
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