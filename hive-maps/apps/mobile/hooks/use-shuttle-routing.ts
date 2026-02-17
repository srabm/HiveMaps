import {useEffect, useState} from 'react';
import {getDirections, Provider, TransportMode, type Coordinate, type DirectionsResponse} from '@/services/maps/directions-api-adapter';
import {getShuttleStopsForTrip, SHUTTLE_STOPS} from '@/services/data/shuttle-stops';

type ShuttleRoutingState = {
    walkToStop: DirectionsResponse | null;
    shuttleLeg: DirectionsResponse | null;
    walkFromStop: DirectionsResponse | null;
    stopsForTrip: ReturnType<typeof getShuttleStopsForTrip> | null;
    stopMarkers: typeof SHUTTLE_STOPS;
};

export const useShuttleRouting = ({
    enabled,
    origin,
    destination,
}: {
    enabled: boolean;
    origin: Coordinate | null;
    destination: Coordinate | null;
}): ShuttleRoutingState => {
    const [walkToStop, setWalkToStop] = useState<DirectionsResponse | null>(null);
    const [shuttleLeg, setShuttleLeg] = useState<DirectionsResponse | null>(null);
    const [walkFromStop, setWalkFromStop] = useState<DirectionsResponse | null>(null);
    const [stopsForTrip, setStopsForTrip] = useState<ReturnType<typeof getShuttleStopsForTrip> | null>(null);

    useEffect(() => {
        let active = true;
        const fetchLegs = async () => {
            if (!enabled || !origin || !destination) {
                setWalkToStop(null);
                setShuttleLeg(null);
                setWalkFromStop(null);
                setStopsForTrip(null);
                return;
            }

            const stops = getShuttleStopsForTrip(origin, destination);
            setStopsForTrip(stops);

            try {
                const [walkTo, shuttleRoute, walkFrom] = await Promise.all([
                    getDirections({
                        origin,
                        destination: stops.originStop.coordinate,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                    }),
                    getDirections({
                        origin: stops.originStop.coordinate,
                        destination: stops.destinationStop.coordinate,
                        transportMode: TransportMode.DRIVING,
                        provider: Provider.MAPBOX,
                    }),
                    getDirections({
                        origin: stops.destinationStop.coordinate,
                        destination,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                    }),
                ]);
                if (!active) return;
                setWalkToStop(walkTo);
                setShuttleLeg(shuttleRoute);
                setWalkFromStop(walkFrom);
            } catch (err) {
                if (!active) return;
                console.warn('Failed to load shuttle routing directions', err);
                setWalkToStop(null);
                setShuttleLeg(null);
                setWalkFromStop(null);
            }
        };
        fetchLegs();
        return () => {
            active = false;
        };
    }, [enabled, origin, destination]);

    return {
        walkToStop,
        shuttleLeg,
        walkFromStop,
        stopsForTrip,
        stopMarkers: SHUTTLE_STOPS,
    };
};
