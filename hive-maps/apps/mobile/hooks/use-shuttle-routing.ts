import {useEffect, useState} from 'react';
import {getDirections, Provider, TransportMode, type Coordinate, type DirectionsResponse, type TimeFilterMode} from '@/services/maps/directions-api-adapter';
import {getShuttleStopsForTrip, SHUTTLE_STOPS} from '@/services/data/shuttle-stops';

type ShuttleRoutingState = {
    walkToStop: DirectionsResponse | null;
    shuttleLeg: DirectionsResponse | null;
    walkFromStop: DirectionsResponse | null;
    stopsForTrip: ReturnType<typeof getShuttleStopsForTrip> | null;
    stopMarkers: typeof SHUTTLE_STOPS;
};

type ShuttleLegs = {
    walkToStop: DirectionsResponse;
    shuttleLeg: DirectionsResponse;
    walkFromStop: DirectionsResponse;
};
/**
 * Advance (or rewind) an ISO timestamp by `seconds`.
 * Guards against NaN/Infinity so a bad API response duration never
 * propagates into subsequent leg requests as "Invalid Date".
 */
function addSeconds(iso: string, seconds: number): string {
    if (!Number.isFinite(seconds)) {
        console.warn('[addSeconds] Non-finite seconds received:', seconds, '— keeping original time');
        return iso;
    }
    return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

async function fetchDepartLegs({
    origin,
    destination,
    stops,
    timeFilter,
}: {
    origin: Coordinate;
    destination: Coordinate;
    stops: ReturnType<typeof getShuttleStopsForTrip>;
    timeFilter: string;
}): Promise<ShuttleLegs> {
    const walkTo = await getDirections({
        origin,
        destination: stops.originStop.coordinate,
        transportMode: TransportMode.WALKING,
        provider: Provider.MAPBOX,
        timeFilter,
        timeFilterMode: 'depart',
    });

    const shuttleDepartTime = addSeconds(timeFilter, walkTo.durationSeconds);
    const shuttleRoute = await getDirections({
        origin: stops.originStop.coordinate,
        destination: stops.destinationStop.coordinate,
        transportMode: TransportMode.DRIVING,
        provider: Provider.MAPBOX,
        timeFilter: shuttleDepartTime,
        timeFilterMode: 'depart',
    });

    const walkFromDepartTime = addSeconds(shuttleDepartTime, shuttleRoute.durationSeconds);
    const walkFrom = await getDirections({
        origin: stops.destinationStop.coordinate,
        destination,
        transportMode: TransportMode.WALKING,
        provider: Provider.MAPBOX,
        timeFilter: walkFromDepartTime,
        timeFilterMode: 'depart',
    });

    return {
        walkToStop: walkTo,
        shuttleLeg: shuttleRoute,
        walkFromStop: walkFrom,
    };
}

async function fetchArriveLegs({
    origin,
    destination,
    stops,
    timeFilter,
}: {
    origin: Coordinate;
    destination: Coordinate;
    stops: ReturnType<typeof getShuttleStopsForTrip>;
    timeFilter: string;
}): Promise<ShuttleLegs> {
    const walkFrom = await getDirections({
        origin: stops.destinationStop.coordinate,
        destination,
        transportMode: TransportMode.WALKING,
        provider: Provider.MAPBOX,
        timeFilter,
        timeFilterMode: 'arrive',
    });

    const shuttleArriveTime = addSeconds(timeFilter, -walkFrom.durationSeconds);
    const shuttleRoute = await getDirections({
        origin: stops.originStop.coordinate,
        destination: stops.destinationStop.coordinate,
        transportMode: TransportMode.DRIVING,
        provider: Provider.MAPBOX,
        timeFilter: shuttleArriveTime,
        timeFilterMode: 'arrive',
    });

    const walkToArriveTime = addSeconds(shuttleArriveTime, -shuttleRoute.durationSeconds);
    const walkTo = await getDirections({
        origin,
        destination: stops.originStop.coordinate,
        transportMode: TransportMode.WALKING,
        provider: Provider.MAPBOX,
        timeFilter: walkToArriveTime,
        timeFilterMode: 'arrive',
    });

    return {
        walkToStop: walkTo,
        shuttleLeg: shuttleRoute,
        walkFromStop: walkFrom,
    };
}

export const useShuttleRouting = ({
    enabled,
    origin,
    destination,
    timeFilter,
    timeFilterMode,
}: {
    enabled: boolean;
    origin: Coordinate | null;
    destination: Coordinate | null;
    timeFilter: string;
    timeFilterMode: TimeFilterMode;
}): ShuttleRoutingState => {
    const [walkToStop, setWalkToStop] = useState<DirectionsResponse | null>(null);
    const [shuttleLeg, setShuttleLeg] = useState<DirectionsResponse | null>(null);
    const [walkFromStop, setWalkFromStop] = useState<DirectionsResponse | null>(null);
    const [stopsForTrip, setStopsForTrip] = useState<ReturnType<typeof getShuttleStopsForTrip> | null>(null);

    useEffect(() => {
        const clearLegs = () => {
            setWalkToStop(null);
            setShuttleLeg(null);
            setWalkFromStop(null);
        };

        const setLegs = (legs: ShuttleLegs) => {
            setWalkToStop(legs.walkToStop);
            setShuttleLeg(legs.shuttleLeg);
            setWalkFromStop(legs.walkFromStop);
        };

        let active = true;

        const fetchLegs = async () => {
            if (!enabled || !origin || !destination) {
                clearLegs();
                setStopsForTrip(null);
                return;
            }

            const stops = getShuttleStopsForTrip(origin, destination);
            setStopsForTrip(stops);

            try {
                const legs = timeFilterMode === 'depart'
                    ? await fetchDepartLegs({origin, destination, stops, timeFilter})
                    : await fetchArriveLegs({origin, destination, stops, timeFilter});
                if (!active) return;
                setLegs(legs);
            } catch (err) {
                if (!active) return;
                console.warn('Failed to load shuttle routing directions', err);
                clearLegs();
            }
        };
        fetchLegs();
        return () => {
            active = false;
        };
    }, [enabled, origin, destination, timeFilter, timeFilterMode]);

    return {
        walkToStop,
        shuttleLeg,
        walkFromStop,
        stopsForTrip,
        stopMarkers: SHUTTLE_STOPS,
    };
};
