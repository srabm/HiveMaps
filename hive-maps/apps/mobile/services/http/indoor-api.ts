import {getApiBaseUrl} from './campus-api';

export type DirectionType = 'STRAIGHT' | 'LEFT' | 'RIGHT' | 'BACK' | 'UP_OR_DOWN' | 'DEFAULT';

export const POI_TYPES = [
  'bathroom', 'bathroom_men', 'bathroom_women', 'bathroom_unisex',
  'bathroom_unisex_acc', 'bathroom_men_acc', 'bathroom_women_acc',
  'bathroom_private_acc', 'water_fountain', 'stairs', 'elevator', 
  'escalator', 'printer', 'ramp'
];
export class NoDirectionsFoundException extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'NoDirectionsFoundException';
    }
}

export interface FloorSummary {
    id: string;
    label: string;
    sortOrder: number;
}

export interface FloorDetailsResponse {
    buildingCode: string;
    floor: { id: string; label: string };
    planGeometry: GeoJSON.Geometry;
    rooms: GeoJSON.FeatureCollection;
}

export interface SupportedIndoorBuilding {
    campusId: string;
    buildingCode: string;
}

export interface IndoorNodeResponse {
    id: string;
    label: string;
    wheelchairAccessible: boolean;
    floor: string;
    building: string;
    longitude: number;
    latitude: number;
}

export interface IndoorDirectionsResponse {
    direction: DirectionType;
    distance: number;
    description: string;
    nodes: IndoorNodeResponse[];
}

const REQUEST_TIMEOUT_MS = 10000;
const baseUrl = getApiBaseUrl();

type HttpStatusError = Error & { status?: number };

export function normalizeIndoorBuildingCode(value: string | undefined | null): string | null {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
}

function getHttpStatus(error: unknown): number | null {
    if (typeof error !== 'object' || error === null || !('status' in error)) return null;
    const status = (error as HttpStatusError).status;
    return typeof status === 'number' ? status : null;
}

async function getIndoorJson<T>(path: string): Promise<T> {
    const url = `${baseUrl}${path}`;
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

    try {
        const response = await fetch(url, controller ? {signal: controller.signal} : undefined);
        if (!response.ok) {
            if (response.status === 422) {
                throw new NoDirectionsFoundException();
            }
            else {
                const error = new Error(`Indoor API request failed (${response.status})`) as HttpStatusError;
                error.status = response.status;
                throw error;
            }
        }
        return (await response.json()) as T;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export async function fetchSupportedIndoorBuildings(): Promise<SupportedIndoorBuilding[]> {
    const buildings = await getIndoorJson<SupportedIndoorBuilding[]>('/api/indoor/buildings');
    return buildings.map((building) => ({
        campusId: building.campusId.toUpperCase(),
        buildingCode: building.buildingCode.toUpperCase(),
    }));
}

export async function fetchBuildingFloors(campusId: string, buildingCode: string): Promise<FloorSummary[]> {
    const path = `/api/campuses/${encodeURIComponent(campusId)}/buildings/${encodeURIComponent(buildingCode)}/floors`;
    const floors = await getIndoorJson<FloorSummary[]>(path);
    return [...floors].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchFloorDetails(
    campusId: string,
    buildingCode: string,
    floorId: string,
): Promise<FloorDetailsResponse | null> {
    const path = `/api/campuses/${encodeURIComponent(campusId)}/buildings/${encodeURIComponent(buildingCode)}/floors/${encodeURIComponent(floorId)}`;

    try {
        return await getIndoorJson<FloorDetailsResponse>(path);
    } catch (error) {
        if (getHttpStatus(error) === 404) return null;
        throw error;
    }
}

export async function fetchNearestNode(
    buildingCode: string,
    floorId: string,
    longitude: number,
    latitude: number,
): Promise<IndoorNodeResponse> {
    const path = `/api/indoor-directions/building/${encodeURIComponent(buildingCode)}/floor/${encodeURIComponent(floorId)}/nearest-node?longitude=${longitude}&latitude=${latitude}`;

    try {
        return await getIndoorJson<IndoorNodeResponse>(path);
    } catch (error) {
        if (getHttpStatus(error) === 404) {
            throw new Error(`No nodes found on ${buildingCode} floor ${floorId} within 20 meters`);
        }
        throw error;
    }
}

export async function fetchIndoorRooms(
    buildingCode: string,
    floorId?: string,
): Promise<IndoorNodeResponse[]>{
    const path = `/api/indoor-directions/building/${encodeURIComponent(buildingCode)}/rooms`;
    const rooms = await getIndoorJson<IndoorNodeResponse[]>(path);
    return floorId ? rooms.filter((room) => room.floor === floorId) : rooms;
}

export async function fetchIndoorEntrances(
    buildingCode: string,
): Promise<IndoorNodeResponse[]>{
    const path = `/api/indoor-directions/building/${encodeURIComponent(buildingCode)}/entrances`;
    return getIndoorJson<IndoorNodeResponse[]>(path);
}

export async function fetchIndoorDirections(
    buildingCode: string,
    startNodeId: string,
    endNodeId: string,
    accessible = false,
): Promise<IndoorDirectionsResponse[]>{
    const path = `/api/indoor-directions/building/${encodeURIComponent(buildingCode)}/from/${encodeURIComponent(startNodeId)}/to/${encodeURIComponent(endNodeId)}?accessible=${accessible}`;
    return getIndoorJson<IndoorDirectionsResponse[]>(path);
}