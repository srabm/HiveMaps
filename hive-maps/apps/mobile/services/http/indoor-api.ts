import { getApiBaseUrl } from './campus-api';

export type BuildingCode = 'LB' | 'MB' | 'H' | 'VL' | 'VE' | 'CC';
export type FloorId = string;

export interface FloorSummary {
  id: FloorId;
  label: string;
  sortOrder: number;
}

export interface FloorDetailsResponse {
  buildingCode: BuildingCode;
  floor: { id: FloorId; label: string };
  planGeometry: GeoJSON.Geometry;
  rooms: GeoJSON.FeatureCollection;
}

export const SUPPORTED_INDOOR_BUILDINGS: Set<string> = new Set(['LB', 'MB', 'H', 'VL', 'VE', 'CC']);

export async function fetchBuildingFloors(campusId: string, buildingCode: BuildingCode): Promise<FloorSummary[]> {
  // TODO: Implement fetch to GET /api/campuses/{campusId}/buildings/{buildingCode}/floors
  return [];
}

export async function fetchFloorDetails(campusId: string, buildingCode: BuildingCode, floorId: FloorId): Promise<FloorDetailsResponse | null> {
  // TODO: Implement fetch to GET /api/campuses/{campusId}/buildings/{buildingCode}/floors/{floorId}
  return null;
}