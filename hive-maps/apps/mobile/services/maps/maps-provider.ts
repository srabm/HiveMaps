import type { Building } from '@/types/campus';

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
  reverse(latitude:number, longitude:number):Promise<MapLocation | null>; // Reverse Geocoding Api to find an address using coordinates
  forward(address: string): Promise<Coordinates | null>; // Temporary Forward Geocoding Api to find coordinates for a full address
  defaultStyleURL: string;
}

export type GeocodedBuilding = {
  building: Building;
  coordinate: Coordinates;
};
