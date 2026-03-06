import type { CampusId, CampusMetaById } from '@/types/campus';
import type { CameraStop } from '@rnmapbox/maps';


const INTER_CAMPUS_PADDING = 0.01;
export function getCameraBoundsForRoute(
    originCampus: CampusId,
    destinationCampus: CampusId,
    campuses: CampusMetaById,
): CameraStop {
    if (originCampus === destinationCampus) {
        const campus = campuses[originCampus];
        return {
            centerCoordinate: campus.center,
            zoomLevel: campus.zoom,
            animationDuration: 800,
        };
    }
    const origin = campuses[originCampus];
    const destination = campuses[destinationCampus];
    const minLongitude = Math.min(origin.center[0], destination.center[0]) - INTER_CAMPUS_PADDING;
    const maxLongitude = Math.max(origin.center[0], destination.center[0]) + INTER_CAMPUS_PADDING;
    const minLatitude = Math.min(origin.center[1], destination.center[1]) - INTER_CAMPUS_PADDING;
    const maxLatitude = Math.max(origin.center[1], destination.center[1]) + INTER_CAMPUS_PADDING;

    return {
        bounds: {
            ne: [maxLongitude, maxLatitude],
            sw: [minLongitude, minLatitude],
            paddingLeft: 40,
            paddingRight: 40,
            paddingTop: 120,
            paddingBottom: 120,
        },
        animationDuration: 1200,
    };
}
