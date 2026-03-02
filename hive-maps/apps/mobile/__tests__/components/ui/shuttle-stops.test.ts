import {
    SHUTTLE_STOPS,
    getNearestShuttleStop,
    getShuttleStopsForTrip,
} from '@/services/data/shuttle-stops';

describe('SHUTTLE_STOPS', () => {
    it('contains SGW and LOY stops', () => {
        expect(SHUTTLE_STOPS.SGW).toBeDefined();
        expect(SHUTTLE_STOPS.LOY).toBeDefined();
    });

    it('SGW stop has correct coordinate', () => {
        expect(SHUTTLE_STOPS.SGW.coordinate.latitude).toBeCloseTo(45.49727);
        expect(SHUTTLE_STOPS.SGW.coordinate.longitude).toBeCloseTo(-73.57892);
    });

    it('LOY stop has correct coordinate', () => {
        expect(SHUTTLE_STOPS.LOY.coordinate.latitude).toBeCloseTo(45.45817);
        expect(SHUTTLE_STOPS.LOY.coordinate.longitude).toBeCloseTo(-73.63917);
    });

    it('each stop has required fields', () => {
        for (const stop of Object.values(SHUTTLE_STOPS)) {
            expect(stop.id).toBeDefined();
            expect(stop.campusId).toBeDefined();
            expect(stop.label).toBeDefined();
            expect(stop.name).toBeDefined();
            expect(stop.address).toBeDefined();
            expect(stop.coordinate.latitude).toBeDefined();
            expect(stop.coordinate.longitude).toBeDefined();
        }
    });
});

describe('getNearestShuttleStop', () => {
    it('returns SGW when coordinate is near SGW', () => {
        const nearSGW = {latitude: 45.497, longitude: -73.579};
        expect(getNearestShuttleStop(nearSGW).id).toBe('SGW');
    });

    it('returns LOY when coordinate is near LOY', () => {
        const nearLOY = {latitude: 45.458, longitude: -73.639};
        expect(getNearestShuttleStop(nearLOY).id).toBe('LOY');
    });

    it('returns SGW when equidistant and SGW is numerically closer', () => {
        // Exactly at SGW coordinate
        const atSGW = {latitude: 45.49727, longitude: -73.57892};
        expect(getNearestShuttleStop(atSGW).id).toBe('SGW');
    });

    it('returns a valid ShuttleStop object', () => {
        const result = getNearestShuttleStop({latitude: 45.497, longitude: -73.579});
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('coordinate');
    });
});

describe('getShuttleStopsForTrip', () => {
    const nearSGW = {latitude: 45.497, longitude: -73.579};
    const nearLOY = {latitude: 45.458, longitude: -73.639};

    it('when origin is near SGW, originStop is SGW and destinationStop is LOY', () => {
        const result = getShuttleStopsForTrip(nearSGW, nearLOY);
        expect(result.originStop.id).toBe('SGW');
        expect(result.destinationStop.id).toBe('LOY');
    });

    it('when origin is near LOY, originStop is LOY and destinationStop is SGW', () => {
        const result = getShuttleStopsForTrip(nearLOY, nearSGW);
        expect(result.originStop.id).toBe('LOY');
        expect(result.destinationStop.id).toBe('SGW');
    });

    it('always returns opposite stops (never same stop for both)', () => {
        const result = getShuttleStopsForTrip(nearSGW, nearLOY);
        expect(result.originStop.id).not.toBe(result.destinationStop.id);
    });

    it('destination is not determined by the destination coordinate but by origin stop', () => {
        // Even if destination coordinate is near SGW, the destination stop should be opposite of origin
        const result = getShuttleStopsForTrip(nearSGW, nearSGW);
        expect(result.originStop.id).toBe('SGW');
        expect(result.destinationStop.id).toBe('LOY');
    });
});
