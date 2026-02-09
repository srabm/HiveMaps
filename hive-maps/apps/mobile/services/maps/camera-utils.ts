import {campuses, type CampusId} from '@/constants/campus';

export interface CameraBounds {
    centerCoordinate: [number, number];
    zoomLevel: number;
    bounds?: {
        ne: [number, number];
        sw: [number, number];
    };
    animationDuration: number;
}

const INTER_CAMPUS_PADDING = 0.01;

export function getCameraBoundsForRoute(
    originCampus: CampusId,
    destinationCampus: CampusId,
): CameraBounds {
    if (originCampus === destinationCampus) {
        const campus = campuses[originCampus];
        return {
            centerCoordinate: campus.center,
            zoomLevel: campus.zoom,
            animationDuration: 800
        };
    }
    const origin = campuses[originCampus];
    const destination = campuses[destinationCampus];
    const centerLongitude = (origin.center[0] + destination.center[0]) /2;
    const centerLatitude = (origin.center[1] + destination.center[1]) /2;
    const minLongitude = Math.min(origin.center[0], destination.center[0]) - INTER_CAMPUS_PADDING;
    const maxLongitude = Math.max(origin.center[0], destination.center[0]) + INTER_CAMPUS_PADDING;
    const minLatitude = Math.min(origin.center[1], destination.center[1]) - INTER_CAMPUS_PADDING;
    const maxLatitude = Math.max(origin.center[1], destination.center[1]) + INTER_CAMPUS_PADDING;

    return {
        centerCoordinate: [centerLongitude, centerLatitude],
        zoomLevel: 12,
        bounds: {
            ne: [maxLongitude, maxLatitude],
            sw: [minLongitude, minLatitude],
        },
        animationDuration: 1200,
    };
}