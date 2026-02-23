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

function addSeconds(iso: string, seconds: number): string {
    return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
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
                if (timeFilterMode === 'depart') {
                    // Depart mode: chain times forward
                    // 1. Walk to stop — depart at timeFilter
                    const walkTo = await getDirections({
                        origin,
                        destination: stops.originStop.coordinate,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                        timeFilter,
                        timeFilterMode: 'depart',
                    });
                    if (!active) return;

                    // 2. Shuttle leg — depart when walk-to-stop finishes
                    const shuttleDepartTime = addSeconds(timeFilter, walkTo.durationSeconds);
                    const shuttleRoute = await getDirections({
                        origin: stops.originStop.coordinate,
                        destination: stops.destinationStop.coordinate,
                        transportMode: TransportMode.DRIVING,
                        provider: Provider.MAPBOX,
                        timeFilter: shuttleDepartTime,
                        timeFilterMode: 'depart',
                    });
                    if (!active) return;

                    // 3. Walk from stop — depart when shuttle arrives
                    const walkFromDepartTime = addSeconds(shuttleDepartTime, shuttleRoute.durationSeconds);
                    const walkFrom = await getDirections({
                        origin: stops.destinationStop.coordinate,
                        destination,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                        timeFilter: walkFromDepartTime,
                        timeFilterMode: 'depart',
                    });
                    if (!active) return;

                    setWalkToStop(walkTo);
                    setShuttleLeg(shuttleRoute);
                    setWalkFromStop(walkFrom);
                } else {
                    // Arrive mode: chain times backward
                    // 1. Walk from stop — arrive at timeFilter
                    const walkFrom = await getDirections({
                        origin: stops.destinationStop.coordinate,
                        destination,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                        timeFilter,
                        timeFilterMode: 'arrive',
                    });
                    if (!active) return;

                    // 2. Shuttle leg — arrive when walk-from-stop needs to depart
                    const shuttleArriveTime = addSeconds(timeFilter, -walkFrom.durationSeconds);
                    const shuttleRoute = await getDirections({
                        origin: stops.originStop.coordinate,
                        destination: stops.destinationStop.coordinate,
                        transportMode: TransportMode.DRIVING,
                        provider: Provider.MAPBOX,
                        timeFilter: shuttleArriveTime,
                        timeFilterMode: 'arrive',
                    });
                    if (!active) return;

                    // 3. Walk to stop — arrive when shuttle departs
                    const walkToArriveTime = addSeconds(shuttleArriveTime, -shuttleRoute.durationSeconds);
                    const walkTo = await getDirections({
                        origin,
                        destination: stops.originStop.coordinate,
                        transportMode: TransportMode.WALKING,
                        provider: Provider.MAPBOX,
                        timeFilter: walkToArriveTime,
                        timeFilterMode: 'arrive',
                    });
                    if (!active) return;

                    setWalkToStop(walkTo);
                    setShuttleLeg(shuttleRoute);
                    setWalkFromStop(walkFrom);
                }
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
    }, [enabled, origin, destination, timeFilter, timeFilterMode]);

    return {
        walkToStop,
        shuttleLeg,
        walkFromStop,
        stopsForTrip,
        stopMarkers: SHUTTLE_STOPS,
    };
};