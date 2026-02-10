import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';

import type { MapLocation, MapsProviderPort } from './maps/maps-provider';

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

  async search(query: string, location: [number, number] | null, sessionToken: string) {
    const activeToken = this.ensureConfigured();
    if (!activeToken) return null;

    const params = new URLSearchParams({
      q: query,
      bbox: '-74.0,45.4,-73.4,45.7', //montreal
      access_token: activeToken,
      session_token: sessionToken,
      limit: '5',
      country: 'ca',
    })

    if (location) {
      params.set('proximity', `${location[0]},${location[1]}`);
    }

    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const suggestions = json?.suggestions;
      if (!suggestions) return null;
      if (Array.isArray(suggestions)) {
        return suggestions.map((val: any) => {
          return {
            name: val?.name,
            id: val?.mapbox_id,
            address: val?.address,
          }
        });
      }
      return null;
    } catch {
      return null;
    }
  }

  async retrieve(id: string, sessionToken: string) {
    const activeToken = this.ensureConfigured();
    if (!activeToken) return null;

    const params = new URLSearchParams({
      access_token: activeToken,
      session_token: sessionToken,
    })

    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${id}?${params}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();

      const coordinates = json?.features?.[0]?.geometry?.coordinates;
      return coordinates as [number, number] ?? null;
    } catch {
      return null;
    }
  }

  async reverse(latitude:number, longitude:number) : Promise<MapLocation | null>{ // Reverse Geocoding Api to find an address using coordinates
    const activeToken = this.ensureConfigured();
    if (!activeToken) return null;

    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${activeToken}`;
    try{
      const res = await fetch(url);
      if(!res.ok) return null;
      const json = await res.json();
      if(!json) return null;

      const data: MapLocation = {
        name: json?.features?.[0]?.properties?.name,
        id: "0",
        address: json?.features?.[0]?.properties?.full_address,
    }
      return data;}

    catch(error){
      console.error("Reverse geocoding failed:",error);
      return null;
    }
  }

  async forward(address:string): Promise<[number, number] | null>{  // Temporary Forward Geocoding Api to find coordinates for a full address
    const activeToken = this.ensureConfigured();
    if (!activeToken) return null;
    const encodedAddress = encodeURIComponent(address);

    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedAddress}&language=en&country=ca&access_token=${activeToken}`;

    try{
      const res = await fetch(url);
      if(!res.ok) return null;
      const json = await res.json();
      if(!json) return null;
      const[lon,lat] = json?.features?.[0]?.geometry.coordinates;
      return [lon,lat];}

    catch(error){
      console.error("Forward geocoding failed:",error);
      return null;
    }
  }


}

export const mapboxMapsAdapter = new MapboxMapsAdapter();

export { MapboxGL };
