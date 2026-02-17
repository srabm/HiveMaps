import type {CampusId} from '@/constants/campus';
import type {Coordinate} from '@/services/maps/directions-api-adapter';

export type ShuttleStop = {
    id: 'SGW' | 'LOY';
    campusId: CampusId;
    label: string;
    name: string;
    address: string;
    coordinate: Coordinate;
};

export const SHUTTLE_STOPS: Record<'SGW' | 'LOY', ShuttleStop> = {
    SGW: {
        id: 'SGW',
        campusId: 'SGW',
        label: 'SGW',
        name: 'Henry F. Hall Building (Front Doors)',
        address: '1455 De Maisonneuve Blvd. W.',
        coordinate: {latitude: 45.49727, longitude: -73.57892},
    },
    LOY: {
        id: 'LOY',
        campusId: 'LOY',
        label: 'Loyola',
        name: 'Loyola Chapel (F.C. Smith Building)',
        address: '7137 Sherbrooke St. W.',
        coordinate: {latitude: 45.45817789834343, longitude: -73.6391711329374},
    },
};

const distanceSquared = (a: Coordinate, b: Coordinate) => {
    const latDiff = a.latitude - b.latitude;
    const lonDiff = a.longitude - b.longitude;
    return latDiff * latDiff + lonDiff * lonDiff;
};

export const getNearestShuttleStop = (coord: Coordinate): ShuttleStop => {
    const sgw = SHUTTLE_STOPS.SGW;
    const loy = SHUTTLE_STOPS.LOY;
    return distanceSquared(coord, sgw.coordinate) <= distanceSquared(coord, loy.coordinate)
        ? sgw
        : loy;
};

export const getShuttleStopsForTrip = (origin: Coordinate, destination: Coordinate) => {
    const originStop = getNearestShuttleStop(origin);
    const destinationStop = originStop.id === 'SGW' ? SHUTTLE_STOPS.LOY : SHUTTLE_STOPS.SGW;
    return {originStop, destinationStop};
};
