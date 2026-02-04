import type { Building } from '@/constants/campus';

export type Coordinates = [number, number]; // [lon, lat]

export interface MapsProviderPort {
  ensureConfigured(): string;
  geocode(address: string): Promise<Coordinates | null>;
  defaultStyleURL: string;
}

export type GeocodedBuilding = {
  building: Building;
  coordinate: Coordinates;
};
