export class PolygonUtils {
    static isPointInRing(point: [number, number], ring: [number, number][]) {
        let inside = false;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            const intersect =
            yi > point[1] !== yj > point[1] &&
            point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }

        return inside;
    }

    // using the ray casting algorithm
    static isPointInPolygon(point: [number, number], coordinates: [number, number][][]) {
        if (!coordinates?.length) return false;
        if (!PolygonUtils.isPointInRing(point, coordinates[0])) return false;

        for (let i = 1; i < coordinates.length; i += 1) {
            if (PolygonUtils.isPointInRing(point, coordinates[i])) return false;
        }

        return true;
    }
}