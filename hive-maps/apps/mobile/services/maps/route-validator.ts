import type { CampusId, CampusMetaById } from '@/types/campus';

export type RouteEndpoint = 
    | {type: 'building'; code: string}
    | {type: 'coordinate'; longitude: number; latitude: number};

export interface CampusRouteRequest {
    origin: RouteEndpoint;
    destination: RouteEndpoint;
}

export interface ValidatedCampusRoute {
    originCampus: CampusId;
    destinationCampus: CampusId;
    isInterCampus: boolean;
    originCode?: string;
    destinationCode?: string;
}

export type ValidationError = 
    | 'UNKNOWN_ORIGIN' | 'UNKNOWN_DESTINATION' | 'SAME_ORIGIN_AND_DESTINATION' | 'COORDINATE_OUT_OF_BOUNDS';

export type ValidationResult = 
    | {valid: true; route: ValidatedCampusRoute}
    | {valid: false; error: ValidationError; message: string};

const CAMPUS_RADIUS_KM = 0.8;

export function getCampusForBuilding(
    code: string,
    buildingCampusByCode: Record<string, CampusId>,
): CampusId | null {
    return buildingCampusByCode[code.toUpperCase()] ?? null;
}

export function haversineKM (
    lon1: number, lat1: number, lon2: number, lat2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getNearestCampus(
    longitude: number,
    latitude: number,
    campuses: CampusMetaById,
): CampusId | null {
    let best: {id: CampusId; dist: number} | null = null;
    for (const campus of Object.values(campuses)) {
        const dist = haversineKM(longitude, latitude, campus.center[0], campus.center[1]);
        if (dist <= CAMPUS_RADIUS_KM && (!best || dist < best.dist)) {
            best = {id: campus.id, dist};
        }
    }
    return best?.id ?? null;
}

type ResolvedEndpoint = {
    campus: CampusId;
    code: string;
};

type EndpointResolution =
    | {valid: true; endpoint: ResolvedEndpoint}
    | {valid: false; error: ValidationError; message: string};

function resolveOriginEndpoint(
    origin: RouteEndpoint,
    campuses: CampusMetaById,
    buildingCampusByCode: Record<string, CampusId>,
): EndpointResolution {
    if (origin.type === 'building') {
        const originCode = origin.code.toUpperCase();
        const originCampus = getCampusForBuilding(originCode, buildingCampusByCode);
        if (!originCampus) {
            return {valid: false, error: 'UNKNOWN_ORIGIN', message: `Building "${originCode}" not found.`};
        }
        return {
            valid: true,
            endpoint: {
                campus: originCampus,
                code: originCode,
            },
        };
    }

    const originCampus = getNearestCampus(origin.longitude, origin.latitude, campuses);
    if (!originCampus) {
        return {
            valid: false,
            error: 'COORDINATE_OUT_OF_BOUNDS',
            message: `Origin coordinates are not within ${CAMPUS_RADIUS_KM}km of any campus.`,
        };
    }

    return {
        valid: true,
        endpoint: {
            campus: originCampus,
            code: 'USER_LOCATION',
        },
    };
}

function resolveDestinationEndpoint(
    destination: RouteEndpoint,
    campuses: CampusMetaById,
    buildingCampusByCode: Record<string, CampusId>,
): EndpointResolution {
    if (destination.type === 'building') {
        const destinationCode = destination.code.toUpperCase();
        const destinationCampus = getCampusForBuilding(destinationCode, buildingCampusByCode);
        if (!destinationCampus) {
            return {valid: false, error: 'UNKNOWN_DESTINATION', message: `Building "${destinationCode}" not found.`};
        }
        return {
            valid: true,
            endpoint: {
                campus: destinationCampus,
                code: destinationCode,
            },
        };
    }

    const destinationCampus = getNearestCampus(destination.longitude, destination.latitude, campuses);
    if (!destinationCampus) {
        return {
            valid: false,
            error: 'COORDINATE_OUT_OF_BOUNDS',
            message: `Destination coordinates are not within ${CAMPUS_RADIUS_KM}km of any campus.`,
        };
    }

    return {
        valid: true,
        endpoint: {
            campus: destinationCampus,
            code: 'USER_LOCATION',
        },
    };
}

export function validateCampusRoute(
    request: CampusRouteRequest,
    campuses: CampusMetaById,
    buildingCampusByCode: Record<string, CampusId> = {},
): ValidationResult {
    const {origin, destination} = request;

    const originResolution = resolveOriginEndpoint(origin, campuses, buildingCampusByCode);
    if (!originResolution.valid) return originResolution;
    const destinationResolution = resolveDestinationEndpoint(destination, campuses, buildingCampusByCode);
    if (!destinationResolution.valid) return destinationResolution;

    const originCampus = originResolution.endpoint.campus;
    const destinationCampus = destinationResolution.endpoint.campus;
    const originCode = originResolution.endpoint.code;
    const destinationCode = destinationResolution.endpoint.code;

    if (origin.type === 'building' && destination.type === 'building' && originCode === destinationCode) {
        return {valid: false, error: 'SAME_ORIGIN_AND_DESTINATION', message: 'Origin and destination buildings cannot be the same.'};
    }

    if (origin.type === 'coordinate' && destination.type === 'coordinate'
        && haversineKM(origin.longitude, origin.latitude, destination.longitude, destination.latitude) < 0.01) {
        return {valid: false, error: 'SAME_ORIGIN_AND_DESTINATION', message: 'Origin and destination cannot be the same location.'};
    }

    return {
        valid: true,
        route: {
            originCampus,
            destinationCampus,
            isInterCampus: originCampus !== destinationCampus,
            originCode,
            destinationCode,
        },
    };
}
