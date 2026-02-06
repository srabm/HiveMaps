import { View } from 'react-native';

import type { MapsProviderPort } from './maps/maps-provider';

// Web preview fallback: we don't ship Mapbox native SDK on web.
// This keeps Metro web bundling happy during `expo run:*` without pulling `@rnmapbox/maps` web deps.
export const MapboxGL = {
  MapView: View,
  Camera: View,
  UserLocation: View,
  PointAnnotation: View,
  StyleURL: { Street: '' },
  setAccessToken: () => undefined,
  setTelemetryEnabled: () => undefined,
} as any;

class WebMapsAdapter implements MapsProviderPort {
  defaultStyleURL = '';
  ensureConfigured() {
    return '';
  }
  async geocode() {
    return null;
  }
  async search(query: string, location: [number, number] | null, sessionToken: string) {
    return null;
  }
  async retrieve(mapboxId: string, sessionToken: string) {
    return null;
  }
}

export const mapboxMapsAdapter = new WebMapsAdapter();

