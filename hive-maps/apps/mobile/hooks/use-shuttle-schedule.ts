import {useMemo} from 'react';
import monThuSchedule from '@/services/data/shuttle_schedule_mon_thu.json';
import fridaySchedule from '@/services/data/shuttle_schedule_friday.json';
import {getShuttleStopsForTrip} from '@/services/data/shuttle-stops';
import type {Coordinate, TimeFilterMode} from '@/services/maps/directions-api-adapter';

type ShuttleSchedule = typeof monThuSchedule;

type UpcomingDeparture = {
    time: string;
    departureDate: Date;
    minutesUntil: number;      // relative to wall clock — for "in X min" display
    minutesFromFilter: number; // relative to timeFilter — for reachability filtering
};

type ShuttleScheduleContext = {
    serviceDate: Date;
    schedule: ShuttleSchedule;
    departureTimes: string[];
    departures: UpcomingDeparture[];
    directionLabel: string;
    showNextServiceLabel: boolean;
    isNextServiceDay: boolean;
    showSeeMoreButton: boolean;
};

const getShuttleScheduleForDate = (date: Date): ShuttleSchedule | null => {
    const day = date.getDay();
    if (day === 0 || day === 6) return null;
    return day === 5 ? fridaySchedule : monThuSchedule;
};

const getNextServiceDate = (date: Date) => {
    const next = new Date(date);
    do {
        next.setDate(next.getDate() + 1);
    } while (!getShuttleScheduleForDate(next));
    return next;
};


const getUpcomingDepartures = (
    departures: string[],
    baseDate: Date,
    filterFrom: Date,
    displayFrom: Date,
    timeFilterMode: TimeFilterMode,
    limit = 5,
): UpcomingDeparture[] => {
    const all = departures.map((time) => {
        const [hoursStr, minutesStr] = time.split(':');
        const hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        const departureDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            hours,
            minutes,
            0,
            0,
        );
        const minutesUntil = Math.round((departureDate.getTime() - displayFrom.getTime()) / 60000);
        const minutesFromFilter = Math.round((departureDate.getTime() - filterFrom.getTime()) / 60000);
        return {time, departureDate, minutesUntil, minutesFromFilter};
    });

    if (timeFilterMode === 'arrive') {
        // Show departures that leave before the arrive-by time, closest first.
        return all
            .filter((item) => item.minutesFromFilter <= 0)
            .reverse()
            .slice(0, limit);
    }

    // Depart mode: upcoming departures at or after the selected time.
    return all
        .filter((item) => item.minutesFromFilter >= 0)
        .slice(0, limit);
};

export const useShuttleSchedule = ({
    enabled,
    origin,
    destination,
    limit = 5,
    timeFilter,
    timeFilterMode = 'depart',
}: {
    enabled: boolean;
    origin: Coordinate;
    destination: Coordinate;
    limit?: number;
    timeFilter?: string;
    timeFilterMode?: TimeFilterMode;
}): ShuttleScheduleContext | null => {
    const now = useMemo(
        () => timeFilter ? new Date(timeFilter) : new Date(),
        [enabled, origin, destination, timeFilter],
    );
    // Always wall clock for "in X min" display labels
    const wallClock = useMemo(() => new Date(), [enabled, origin, destination, timeFilter]);

    return useMemo(() => {
        if (!enabled) return null;
        const shuttleStops = getShuttleStopsForTrip(origin, destination);
        const directionLabel = `${shuttleStops.originStop.label} -> ${shuttleStops.destinationStop.label}`;
        const originStopId = shuttleStops.originStop.id;

        let serviceDate = new Date(now);
        let schedule = getShuttleScheduleForDate(serviceDate);
        let departureTimes = schedule
            ? originStopId === 'SGW'
                ? schedule.departures.sgw
                : schedule.departures.loyola
            : [];
        let departures = schedule
            ? getUpcomingDepartures(departureTimes, serviceDate, now, wallClock, timeFilterMode, limit)
            : [];

        if (!schedule || departures.length === 0) {
            serviceDate = getNextServiceDate(serviceDate);
            schedule = getShuttleScheduleForDate(serviceDate);
            departureTimes = schedule
                ? originStopId === 'SGW'
                    ? schedule.departures.sgw
                    : schedule.departures.loyola
                : [];
            departures = schedule
                ? getUpcomingDepartures(departureTimes, serviceDate, now, wallClock, timeFilterMode, limit)
                : [];
        }

        const showNextServiceLabel = serviceDate.toDateString() !== now.toDateString();
        const isNextServiceDay = showNextServiceLabel;
        const showSeeMoreButton = departureTimes.length > departures.length;

        if (!schedule) return null;
        return {
            serviceDate,
            schedule,
            departureTimes,
            departures,
            directionLabel,
            showNextServiceLabel,
            isNextServiceDay,
            showSeeMoreButton,
        };
    }, [enabled, origin, destination, now, wallClock, limit, timeFilter, timeFilterMode]);
};