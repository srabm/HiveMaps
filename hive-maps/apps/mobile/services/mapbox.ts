import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';

import type { MapsProviderPort } from './maps/maps-provider';

const PLACEHOLDER_TOKENS = new Set([
  'YOUR_MAPBOX_TOKEN_HERE',
  'YOUR_MAPBOX_ACCESS_TOKEN',
  'YOUR_MAPBOX_TOKEN',
]);

// Prefer EXPO_PUBLIC_* env var for local dev. If app.json contains a placeholder, fall back to env.
const extraToken = Constants.expoConfig?.extra?.mapboxAccessToken ?? '';
const envToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const rawToken = envToken || extraToken;

const token = !rawToken || PLACEHOLDER_TOKENS.has(rawToken) ? '' : rawToken;

let configured = false;

class MapboxMapsAdapter implements MapsProviderPort {
  defaultStyleURL = MapboxGL.StyleURL.Street;

  ensureConfigured() {
    if (!configured && token) {
      MapboxGL.setAccessToken(token);
      MapboxGL.setTelemetryEnabled(false);
      configured = true;
    }
    return token;
  }

  async geocode(address: string) {
    const activeToken = this.ensureConfigured();
    if (!activeToken) return null;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json?access_token=${activeToken}&limit=1&country=ca`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const center = json?.features?.[0]?.center;
      if (Array.isArray(center) && center.length >= 2) {
        return [center[0], center[1]] as [number, number];
      }
    } catch {
      return null;
    }
    return null;
  }
}

export const mapboxMapsAdapter = new MapboxMapsAdapter();

export { MapboxGL };
