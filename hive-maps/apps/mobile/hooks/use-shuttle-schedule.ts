import {useMemo} from 'react';
import monThuSchedule from '@/services/data/shuttle_schedule_mon_thu.json';
import fridaySchedule from '@/services/data/shuttle_schedule_friday.json';
import {getShuttleStopsForTrip} from '@/services/data/shuttle-stops';
import type {Coordinate, TimeFilterMode} from '@/services/maps/directions-api-adapter';

type ShuttleSchedule = typeof monThuSchedule;

type UpcomingDeparture = {
    time: string;
    departureDate: Date;
    /** Minutes until departure relative to the real wall clock — for "in X min" display. */
    minutesUntil: number;
    /** Minutes until departure relative to timeFilter — for reachability filtering. */
    minutesFromFilter: number;
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

const getTimesForStop = (schedule: ShuttleSchedule, originStopId: string): string[] =>
    originStopId === 'SGW' ? schedule.departures.sgw : schedule.departures.loyola;

/**
 * Build the upcoming-departure list.
 *
 * @param departureTimes  Raw "HH:MM" strings from the schedule JSON.
 * @param baseDate        The calendar date these times belong to.
 * @param filterAnchor    The selected timeFilter instant — drives minutesFromFilter.
 * @param wallClock       The real current time — drives minutesUntil display labels.
 * @param timeFilterMode  'depart' or 'arrive'.
 * @param limit           Max items to return.
 */
const getUpcomingDepartures = (
    departureTimes: string[],
    baseDate: Date,
    filterAnchor: Date,
    wallClock: Date,
    timeFilterMode: TimeFilterMode,
    limit = 5,
): UpcomingDeparture[] => {
    const all = departureTimes.map((time) => {
        const [hoursStr, minutesStr] = time.split(':');
        const departureDate = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            Number(hoursStr),
            Number(minutesStr),
            0,
            0,
        );
        // minutesUntil: always relative to the real wall clock for display ("in X min").
        const minutesUntil = Math.round((departureDate.getTime() - wallClock.getTime()) / 60_000);
        // minutesFromFilter: relative to the selected filter time for reachability checks.
        const minutesFromFilter = Math.round((departureDate.getTime() - filterAnchor.getTime()) / 60_000);
        return {time, departureDate, minutesUntil, minutesFromFilter};
    });

    if (timeFilterMode === 'arrive') {
        // Arrive mode: show departures that leave before the arrive-by time.
        // Take the LAST `limit` items (those closest to the arrive-by time)
        // and keep them in ascending chronological order for display.
        const valid = all.filter((item) => item.minutesFromFilter <= 0);
        return valid.slice(-limit);
    }

    // Depart mode: upcoming departures at or after the filter anchor.
    return all.filter((item) => item.minutesFromFilter >= 0).slice(0, limit);
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
    /**
     * filterAnchor — the selected time (used for minutesFromFilter / reachability).
     * Re-computed only when timeFilter or the route actually changes.
     */
    const filterAnchor = useMemo(
        () => (timeFilter ? new Date(timeFilter) : new Date()),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [enabled, origin, destination, timeFilter],
    );

    /**
     * wallClock — always "right now".
     * Used exclusively for the "in X min" display label (minutesUntil).
     * Intentionally re-computed on the same deps so it stays in sync
     * with the rest of the memo without introducing a separate interval.
     */
    const wallClock = useMemo(
        () => new Date(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [enabled, origin, destination, timeFilter],
    );

    return useMemo(() => {
        if (!enabled) return null;

        const shuttleStops = getShuttleStopsForTrip(origin, destination);
        const directionLabel = `${shuttleStops.originStop.label} -> ${shuttleStops.destinationStop.label}`;
        const originStopId = shuttleStops.originStop.id;

        // ── Service-date selection ─────────────────────────────────────────────
        // Always start from the WALL CLOCK date, not the filter anchor.
        // If it is currently 8 PM Monday and the user picks "Depart at 4 AM Tuesday",
        // we still want today's remaining schedule as the first candidate.
        let serviceDate = new Date(wallClock);
        let schedule = getShuttleScheduleForDate(serviceDate);
        let departureTimes = schedule ? getTimesForStop(schedule, originStopId) : [];
        let departures = schedule
            ? getUpcomingDepartures(departureTimes, serviceDate, filterAnchor, wallClock, timeFilterMode, limit)
            : [];

        // If today has no schedule or no departures survive the filter, advance to next service day.
        if (!schedule || departures.length === 0) {
            serviceDate = getNextServiceDate(serviceDate);
            schedule = getShuttleScheduleForDate(serviceDate);
            departureTimes = schedule ? getTimesForStop(schedule, originStopId) : [];
            departures = schedule
                ? getUpcomingDepartures(departureTimes, serviceDate, filterAnchor, wallClock, timeFilterMode, limit)
                : [];
        }

        if (!schedule) return null;

        // showNextServiceLabel is true when the best service date is not today (wall-clock).
        const showNextServiceLabel = serviceDate.toDateString() !== wallClock.toDateString();
        const isNextServiceDay = showNextServiceLabel;
        const showSeeMoreButton = departureTimes.length > departures.length;

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
    }, [enabled, origin, destination, filterAnchor, wallClock, limit, timeFilter, timeFilterMode]);
};