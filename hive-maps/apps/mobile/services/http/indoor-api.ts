import { getApiBaseUrl } from './campus-api';

export type BuildingCode = 'LB' | 'MB' | 'H' | 'VL' | 'VE' | 'CC';
export type FloorId = string;
export type IndoorCampusId = 'SGW' | 'LOY';

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

const LOY_BUILDINGS: Set<BuildingCode> = new Set(['VL', 'VE', 'CC']);
const REQUEST_TIMEOUT_MS = 10000;
const baseUrl = getApiBaseUrl();

type HttpStatusError = Error & { status?: number };

export const SUPPORTED_INDOOR_BUILDINGS: Set<BuildingCode> = new Set(['LB', 'MB', 'H', 'VL', 'VE', 'CC']);

export function parseIndoorBuildingCode(value: string | undefined | null): BuildingCode | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return SUPPORTED_INDOOR_BUILDINGS.has(upper as BuildingCode) ? (upper as BuildingCode) : null;
}

export function getCampusIdForIndoorBuilding(buildingCode: BuildingCode): IndoorCampusId {
  return LOY_BUILDINGS.has(buildingCode) ? 'LOY' : 'SGW';
}

function getHttpStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  const status = (error as HttpStatusError).status;
  return typeof status === 'number' ? status : null;
}

async function getIndoorJson<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      const error = new Error(`Indoor API request failed (${response.status})`) as HttpStatusError;
      error.status = response.status;
      throw error;
    }
    return (await response.json()) as T;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchBuildingFloors(campusId: IndoorCampusId, buildingCode: BuildingCode): Promise<FloorSummary[]> {
  const path = `/api/campuses/${encodeURIComponent(campusId)}/buildings/${encodeURIComponent(buildingCode)}/floors`;
  const floors = await getIndoorJson<FloorSummary[]>(path);
  return [...floors].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchFloorDetails(
  campusId: IndoorCampusId,
  buildingCode: BuildingCode,
  floorId: FloorId,
): Promise<FloorDetailsResponse | null> {
  const path = `/api/campuses/${encodeURIComponent(campusId)}/buildings/${encodeURIComponent(buildingCode)}/floors/${encodeURIComponent(floorId)}`;

  try {
    return await getIndoorJson<FloorDetailsResponse>(path);
  } catch (error) {
    if (getHttpStatus(error) === 404) return null;
    throw error;
  }
}
