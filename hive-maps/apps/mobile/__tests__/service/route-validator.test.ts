import {
    getCampusForBuilding,
    getNearestCampus,
    haversineKM,
    validateCampusRoute,
} from '../../services/maps/route-validator';
import {campuses} from '../../constants/campus';

describe('route-validator helpers', () => {
    it('resolves campus for a building code (case-insensitive)', () => {
        expect(getCampusForBuilding('h')).toBe('SGW');
        expect(getCampusForBuilding('CC')).toBe('LOY');
    });

    it('returns null for unknown building code', () => {
        expect(getCampusForBuilding('UNKNOWN')).toBeNull();
    });

    it('computes haversine distance and is symmetric', () => {
        const sgw = campuses.SGW.center;
        const loy = campuses.LOY.center;
        const samePoint = haversineKM(sgw[0], sgw[1], sgw[0], sgw[1]);
        const sgwToLoy = haversineKM(sgw[0], sgw[1], loy[0], loy[1]);
        const loyToSgw = haversineKM(loy[0], loy[1], sgw[0], sgw[1]);

        expect(samePoint).toBeCloseTo(0, 6);
        expect(sgwToLoy).toBeGreaterThan(0);
        expect(sgwToLoy).toBeCloseTo(loyToSgw, 6);
    });

    it('finds nearest campus when within radius and returns null when out of bounds', () => {
        expect(getNearestCampus(campuses.SGW.center[0], campuses.SGW.center[1])).toBe('SGW');
        expect(getNearestCampus(campuses.LOY.center[0], campuses.LOY.center[1])).toBe('LOY');
        expect(getNearestCampus(0, 0)).toBeNull();
    });
});

describe('validateCampusRoute', () => {
    it('returns UNKNOWN_ORIGIN for unknown origin building', () => {
        const result = validateCampusRoute({
            origin: {type: 'building', code: 'nope'},
            destination: {type: 'building', code: 'H'},
        });

        expect(result).toEqual({
            valid: false,
            error: 'UNKNOWN_ORIGIN',
            message: 'Building "NOPE" not found.',
        });
    });

    it('returns UNKNOWN_DESTINATION for unknown destination building', () => {
        const result = validateCampusRoute({
            origin: {type: 'building', code: 'H'},
            destination: {type: 'building', code: 'nope'},
        });

        expect(result).toEqual({
            valid: false,
            error: 'UNKNOWN_DESTINATION',
            message: 'Building "NOPE" not found.',
        });
    });

    it('returns COORDINATE_OUT_OF_BOUNDS for origin coordinate out of campus radius', () => {
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: 0, latitude: 0},
            destination: {type: 'building', code: 'H'},
        });

        expect(result).toEqual({
            valid: false,
            error: 'COORDINATE_OUT_OF_BOUNDS',
            message: 'Origin coordinates are not within 0.8km of any campus.',
        });
    });

    it('returns COORDINATE_OUT_OF_BOUNDS for destination coordinate out of campus radius', () => {
        const result = validateCampusRoute({
            origin: {type: 'building', code: 'H'},
            destination: {type: 'coordinate', longitude: 0, latitude: 0},
        });

        expect(result).toEqual({
            valid: false,
            error: 'COORDINATE_OUT_OF_BOUNDS',
            message: 'Destination coordinates are not within 0.8km of any campus.',
        });
    });

    it('returns SAME_ORIGIN_AND_DESTINATION for same building', () => {
        const result = validateCampusRoute({
            origin: {type: 'building', code: 'h'},
            destination: {type: 'building', code: 'H'},
        });

        expect(result).toEqual({
            valid: false,
            error: 'SAME_ORIGIN_AND_DESTINATION',
            message: 'Origin and destination buildings cannot be the same.',
        });
    });

    it('returns SAME_ORIGIN_AND_DESTINATION for near-identical coordinates', () => {
        const [lon, lat] = campuses.SGW.center;
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: lon, latitude: lat},
            destination: {type: 'coordinate', longitude: lon + 0.00001, latitude: lat + 0.00001},
        });

        expect(result).toEqual({
            valid: false,
            error: 'SAME_ORIGIN_AND_DESTINATION',
            message: 'Origin and destination cannot be the same location.',
        });
    });

    it('returns valid inter-campus route for SGW -> LOY buildings', () => {
        const result = validateCampusRoute({
            origin: {type: 'building', code: 'H'},
            destination: {type: 'building', code: 'CC'},
        });

        expect(result).toEqual({
            valid: true,
            route: {
                originCampus: 'SGW',
                destinationCampus: 'LOY',
                isInterCampus: true,
                originCode: 'H',
                destinationCode: 'CC',
            },
        });
    });

    it('returns valid same-campus route when using user coordinate and SGW building', () => {
        const [lon, lat] = campuses.SGW.center;
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: lon, latitude: lat},
            destination: {type: 'building', code: 'H'},
        });

        expect(result).toEqual({
            valid: true,
            route: {
                originCampus: 'SGW',
                destinationCampus: 'SGW',
                isInterCampus: false,
                originCode: 'USER_LOCATION',
                destinationCode: 'H',
            },
        });
    });
});
