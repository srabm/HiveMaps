import type { Building } from '@/constants/campus';

export type Coordinates = [number, number]; // [lon, lat]
export type MapLocation = {
  name: string;
  id: string;
  address: string;
}

export interface MapsProviderPort {
  ensureConfigured(): string;
  geocode(address: string): Promise<Coordinates | null>;
  search(query: string, coordinates: Coordinates | null, sessionToken: string): Promise<MapLocation[] | null>;
  retrieve(id: string, sessionToken: string): Promise<Coordinates | null>;
  defaultStyleURL: string;
}

export type GeocodedBuilding = {
  building: Building;
  coordinate: Coordinates;
};
