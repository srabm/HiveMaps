import React from 'react';
import {fireEvent, render, waitFor, act, screen} from '@testing-library/react-native';
import {
    NavigationBottom,
    buildSimpleArrivalDepartureLabel,
    calculateTransitArrivalDepartureLabel,
    formatDistance,
    formatDuration,
    mapUiModeToTransportMode,
} from '../../components/ui/navigation-bottom';
import {TransportMode, Provider} from '@/services/maps/directions-api-adapter';

// directions adapter mock so no real fetch calls are made
jest.mock('@/services/maps/directions-api-adapter', () => {
    const actual = jest.requireActual('@/services/maps/directions-api-adapter');
    return {
        ...actual,
        getDirections: jest.fn().mockResolvedValue({
            distanceMeters: 1500,
            durationSeconds: 720,
            polyline: 'mockPoly',
            steps: [],
        }),
    };
});

jest.mock('@/hooks/use-shuttle-schedule', () => ({
    useShuttleSchedule: jest.fn(),
}));

jest.mock('@/hooks/use-shuttle-routing', () => ({
    useShuttleRouting: jest.fn(),
}));

jest.mock('@/services/maps/route-validator', () => ({
    validateCampusRoute: jest.fn(),
}));

jest.mock('@/utils/timeFormatter', () => ({
    ...jest.requireActual('@/utils/timeFormatter'),
    getCurrentTimeISO: jest.fn(),
    formatISOToTime: jest.fn(),
}));

jest.mock('../../components/ui/TimePickerModal', () => {
    const React = require('react');
    const {Pressable, Text} = require('react-native');
    return {
        TimePickerModal: ({visible, onConfirm}: any) =>
            visible ? (
                <Pressable
                    onPress={() => onConfirm('2026-02-23T13:00:00.000Z', 'arrive')}
                    testID="confirm-arrive-time"
                >
                    <Text>Confirm arrive time</Text>
                </Pressable>
            ) : null,
    };
});

jest.mock('@/components/ui/shuttle-schedule-section', () => {
    const React = require('react');
    const {View, Text, Pressable} = require('react-native');
    return {
        ShuttleScheduleSection: jest.fn((props: any) => (
            <View>
                {props.departures?.map((item: any) => (
                    <Text key={item.key}>{item.etaLabel}</Text>
                ))}
                {props.inlineMetrics ? <Text>{props.inlineMetrics.arrivalLabel}</Text> : null}
                {(!props.hasSchedule || props.showNextServiceLabel || (props.departures?.length ?? 0) === 0) &&
                !props.showSameCampusRedirect &&
                props.onFallbackPress ? (
                    <Pressable onPress={props.onFallbackPress}>
                        <Text>Check Transit</Text>
                    </Pressable>
                ) : null}
                {props.showSameCampusRedirect && props.onSameCampusRedirect ? (
                    <Pressable onPress={props.onSameCampusRedirect}>
                        <Text>Switch to Walk</Text>
                    </Pressable>
                ) : null}
            </View>
        )),
    };
});

const {getDirections} = require('@/services/maps/directions-api-adapter');
const {useShuttleSchedule} = require('@/hooks/use-shuttle-schedule');
const {useShuttleRouting} = require('@/hooks/use-shuttle-routing');
const {validateCampusRoute} = require('@/services/maps/route-validator');
const {getCurrentTimeISO, formatISOToTime} = require('@/utils/timeFormatter');
const {ShuttleScheduleSection} = require('@/components/ui/shuttle-schedule-section');
const origin = {latitude: 45.4972, longitude: -73.5787};
const destination = {latitude: 45.4583, longitude: -73.6406};

jest.useFakeTimers();

beforeEach(() => {
    jest.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));
    getCurrentTimeISO.mockReturnValue('2026-02-23T12:00:00.000Z');
    formatISOToTime.mockImplementation((iso: string) => new Date(iso).toISOString().slice(11, 16));
    validateCampusRoute.mockReturnValue({
        valid: true,
        route: {isInterCampus: true},
    });
    useShuttleSchedule.mockReturnValue(null);
    useShuttleRouting.mockReturnValue({
        walkToStop: null,
        shuttleLeg: null,
        walkFromStop: null,
        stopsForTrip: null,
        stopMarkers: [],
    });
});

afterEach(() => {
    jest.clearAllMocks();
});

//task 2.3.4 displays distance and estimated travel time
describe('NavigationBottom rendering', () => {
    it('renders all four transport mode buttons', async () => {
        const {getAllByText, getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        // 'Drive' appears in both header and mode bar
        expect(getAllByText('Drive').length).toBeGreaterThanOrEqual(1);
        expect(getByText('Walk')).toBeTruthy();
        expect(getByText('Transit')).toBeTruthy();
        expect(getByText('Shuttle')).toBeTruthy();
        await waitFor(() => {});
    });

    it('renders the start button', async () => {
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        expect(getByText('Start')).toBeTruthy();
        await waitFor(() => {});
    });

    it('renders the depart-at control and refresh button', async () => {
        const {getByTestId} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );

        expect(getByTestId('depart-at-button')).toBeTruthy();
        expect(getByTestId('refresh-time-filter-button')).toBeTruthy();
        await waitFor(() => {});
    });

    it('shows distance and duration', async () => {
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        await waitFor(() => {
            expect(getByText('1.5 km')).toBeTruthy();
            expect(getByText('12')).toBeTruthy();
            expect(getByText('min')).toBeTruthy();
        });
    });

    it('shows dash when directions have not loaded', () => {
        getDirections.mockReturnValue(new Promise(() => {}));
        const {getAllByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        // '—' appears for both duration value and distance
        expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
    });
});

//task 2.3.2 mode switching calls API with correct transport mode
describe('NavigationBottom mode switching', () => {
    it('calls onModeChange when a mode is selected', async () => {
        const onModeChange = jest.fn();
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination} onModeChange = {onModeChange}/>
        );
        fireEvent.press(getByText('Walk'));
        expect(onModeChange).toHaveBeenCalledWith('Walk');
        await waitFor(() => {});
    });

    it('updates header text when mode is switched', async () => {
        const {getByText, getAllByText} = render(
            <NavigationBottom origin = {origin} destination = {destination} initialMode = 'Drive'/>
        );
        fireEvent.press(getByText('Shuttle'));
        expect(getAllByText('Shuttle').length).toBeGreaterThanOrEqual(1);
        await waitFor(() => {});
    });

    it('calls getDirections with provider for Transit mode', async () => {
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        fireEvent.press(getByText('Transit'));
        await waitFor(() => {
            const lastCall = getDirections.mock.calls[getDirections.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe(Provider.GOOGLE_MAPS);
            expect(lastCall.transportMode).toBe(TransportMode.TRANSIT);
        });
    });

    it('calls getDirections with Mapbox for non-Transit modes', async () => {
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );
        fireEvent.press(getByText('Walk'));
        await waitFor(() => {
            const lastCall = getDirections.mock.calls[getDirections.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe(Provider.MAPBOX);
            expect(lastCall.transportMode).toBe(TransportMode.WALKING);
        });
    });
});

//task 2.3.5 callbacks
describe('NavigationBottom callbacks', () => {
    it('calls onStartPress when Start is pressed', async () => {
        const onStartPress = jest.fn();
        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination} onStartPress = {onStartPress}/>
        );
        fireEvent.press(getByText('Start'));
        expect(onStartPress).toHaveBeenCalled();
        await waitFor(() => {});
    });

    it('calls onDirectionsChange when directions load', async () => {
        const onDirectionsChange = jest.fn();
        // ensure mock is fresh and returns expected data
        getDirections.mockResolvedValue({
            distanceMeters: 1500,
            durationSeconds: 720,
            polyline: 'mockPoly',
            steps: [],
        });
        render(
            <NavigationBottom origin = {origin} destination = {destination} onDirectionsChange = {onDirectionsChange}/>
        );
        await waitFor(() => {
            expect(onDirectionsChange).toHaveBeenCalledWith(
                expect.objectContaining({distanceMeters: 1500, durationSeconds: 720})
            );
        });
    });

    it('refreshes the displayed time when the refresh button is pressed', async () => {
        getCurrentTimeISO
            .mockReturnValueOnce('2026-02-23T12:00:00.000Z')
            .mockReturnValueOnce('2026-02-23T12:05:00.000Z');

        const {getByTestId, getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );

        expect(getByText('12:00')).toBeTruthy();

        fireEvent.press(getByTestId('refresh-time-filter-button'));

        await waitFor(() => {
            expect(getByText('12:05')).toBeTruthy();
        });
    });

    it('keeps the default time current while no custom time is selected', async () => {
        getCurrentTimeISO
            .mockReturnValueOnce('2026-02-23T12:00:00.000Z')
            .mockReturnValueOnce('2026-02-23T12:01:00.000Z');

        const {getByText} = render(
            <NavigationBottom origin = {origin} destination = {destination}/>
        );

        expect(getByText('12:00')).toBeTruthy();

        await act(async () => {
            jest.advanceTimersByTime(60_000);
        });

        await waitFor(() => {
            expect(getByText('12:01')).toBeTruthy();
        });
    });
});

describe('NavigationBottom shuttle compact layout', () => {
    it('renders the compact shuttle card with see schedule action', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: ['12:20', '13:00'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: 20,
                },
            ],
        });

        const {getByText, getByTestId, queryByTestId} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        await waitFor(() => {
            expect(getByText('Start')).toBeTruthy();
        });

        expect(getByTestId('navigation-bottom-shuttle')).toBeTruthy();
        expect(getByTestId('shuttle-see-schedule-button')).toBeTruthy();
        expect(queryByTestId('navigation-minimize-button')).toBeNull();
    });
});
// task 2.5.4: route filtering option with arrival time using first transit step departure time and remaining legs
describe('NavigationBottom transit timing details', () => {
    it('shows computed arrive-by time from transit departure + remaining legs', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 2100,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [
                {duration: 300},
                {duration: 1200, transitDetails: {departureTime: '2026-02-23T12:20:00.000Z'}},
                {duration: 300},
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(getByText('Arrive by 12:45')).toBeTruthy();
        });
    });
    it('falls back to duration math when transit response has no transit steps', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 2100,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [{duration: 300}, {duration: 1200}, {duration: 300}],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(getByText('Arrive by 12:30')).toBeTruthy();
        });
    });
    // task 2.5.4: computes Depart at using last transit step arrival time and total trip duration minus final walking duration
    it('shows computed depart-at time in arrive mode from last transit arrival', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 2100,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [
                {duration: 300},
                {duration: 1200, transitDetails: {arrivalTime: '2026-02-23T13:00:00.000Z'}},
                {duration: 300},
            ],
        });

        const {getByText, getByTestId} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        fireEvent.press(getByTestId('depart-at-button'));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(getByText('Depart at 12:35')).toBeTruthy();
        });
    });
    it('clears arrival/departure details when transit steps are empty', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 1200,
            durationSeconds: 600,
            polyline: 'mockPoly',
            steps: [],
        });

        const {queryByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(queryByText(/Arrive by \d{2}:\d{2}/)).toBeNull();
            expect(queryByText(/Depart at \d{2}:\d{2}/)).toBeNull();
        });
    });

    it('clears details when first transit step has no departure time in depart mode', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 2100,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [
                {duration: 300},
                {duration: 1200, transitDetails: {}},
                {duration: 300},
            ],
        });

        const {queryByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(queryByText(/Arrive by \d{2}:\d{2}/)).toBeNull();
        });
    });

    it('clears details when last transit step has no arrival time in arrive mode', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 2100,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [
                {duration: 300},
                {duration: 1200, transitDetails: {}},
                {duration: 300},
            ],
        });

        const {getByText, getByTestId, queryByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Transit" />
        );

        fireEvent.press(getByTestId('depart-at-button'));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(queryByText(/Depart at \d{2}:\d{2}/)).toBeNull();
        });
    });
});

describe('NavigationBottom helper-path coverage', () => {
    it('uses DRIVING transport mode for Drive', async () => {
        render(<NavigationBottom origin={origin} destination={destination} initialMode="Drive" />);

        await waitFor(() => {
            const lastCall = getDirections.mock.calls[getDirections.mock.calls.length - 1][0];
            expect(lastCall.transportMode).toBe(TransportMode.DRIVING);
        });
    });

    it('shows meter distance formatting for sub-kilometer distance', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 850,
            durationSeconds: 420,
            polyline: 'mockPoly',
            steps: [],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Drive" />
        );

        await waitFor(() => {
            expect(getByText('850 m')).toBeTruthy();
        });
    });

    it('shows hour-format duration when trip exceeds 60 minutes', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 4200,
            durationSeconds: 3900, // 1h05
            polyline: 'mockPoly',
            steps: [],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Drive" />
        );

        await waitFor(() => {
            expect(getByText('1:05')).toBeTruthy();
            expect(getByText('hr')).toBeTruthy();
        });
    });

    it('computes simple depart-at label in arrive mode for Walk', async () => {
        getDirections.mockResolvedValue({
            distanceMeters: 1200,
            durationSeconds: 1800,
            polyline: 'mockPoly',
            steps: [],
        });

        const {getByText, getByTestId} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Walk" />
        );

        fireEvent.press(getByTestId('depart-at-button'));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(getByText('Depart at 12:30')).toBeTruthy();
        });
    });

    it('maps UI modes to transport modes including Shuttle -> TRANSIT', () => {
        expect(mapUiModeToTransportMode('Drive')).toBe(TransportMode.DRIVING);
        expect(mapUiModeToTransportMode('Walk')).toBe(TransportMode.WALKING);
        expect(mapUiModeToTransportMode('Transit')).toBe(TransportMode.TRANSIT);
        expect(mapUiModeToTransportMode('Shuttle')).toBe(TransportMode.TRANSIT);
    });

    it('formats distance and duration helper outputs', () => {
        expect(formatDistance()).toBe('—');
        expect(formatDistance(850)).toBe('850 m');
        expect(formatDistance(1500)).toBe('1.5 km');
        expect(formatDuration()).toBe('— min');
        expect(formatDuration(720)).toBe('12 min');
        expect(formatDuration(3900)).toBe('1:05 hr');
    });

    it('builds simple arrival/departure labels for depart and arrive filters', () => {
        const departLabel = buildSimpleArrivalDepartureLabel(
            1800,
            '2026-02-23T12:00:00.000Z',
            'depart',
        );
        const arriveLabel = buildSimpleArrivalDepartureLabel(
            1800,
            '2026-02-23T13:00:00.000Z',
            'arrive',
        );

        expect(departLabel).toBe('Arrive by 12:30');
        expect(arriveLabel).toBe('Depart at 12:30');
    });

    it('calculates transit labels using fallback/no-step and transit-step paths', () => {
        const noStepsLabel = calculateTransitArrivalDepartureLabel(
            {
                distanceMeters: 1000,
                durationSeconds: 600,
                polyline: 'mock',
                steps: [],
            } as any,
            '2026-02-23T12:00:00.000Z',
            'depart',
        );
        const fallbackLabel = calculateTransitArrivalDepartureLabel(
            {
                distanceMeters: 1000,
                durationSeconds: 600,
                polyline: 'mock',
                steps: [{duration: 120}, {duration: 480}],
            } as any,
            '2026-02-23T12:00:00.000Z',
            'depart',
        );
        const transitLabel = calculateTransitArrivalDepartureLabel(
            {
                distanceMeters: 1000,
                durationSeconds: 1800,
                polyline: 'mock',
                steps: [
                    {duration: 300},
                    {duration: 1200, transitDetails: {departureTime: '2026-02-23T12:20:00.000Z'}},
                    {duration: 300},
                ],
            } as any,
            '2026-02-23T12:00:00.000Z',
            'depart',
        );

        expect(noStepsLabel).toBe('');
        expect(fallbackLabel).toBe('Arrive by 12:10');
        expect(transitLabel).toBe('Arrive by 12:45');
    });
});

describe('NavigationBottom shuttle additions', () => {
    it('formats shuttle departure ETA labels for hr+min and whole hr values', async () => { // task-2.6.4: verifies ETA display
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 1200, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 150},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: [],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '13:20',
                    departureDate: new Date('2026-02-23T13:20:00.000Z'),
                    minutesUntil: 80,
                    minutesFromFilter: 90,
                },
                {
                    time: '14:00',
                    departureDate: new Date('2026-02-23T14:00:00.000Z'),
                    minutesUntil: 120,
                    minutesFromFilter: 130,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        fireEvent.press(getByText('See schedule'));

        await waitFor(() => {
            expect(getByText('Shuttle Schedule')).toBeTruthy();
        });
    });
    // task 2.6.5: verifies that in shuttle mode, when all 3 legs are present, total duration is sum of legs, total distance is sum of legs and arrival label uses shuttle-computed label (not normal directions label)
    it('uses combined shuttle leg metrics and arrival label in the metrics row', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: [],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: 20,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        await waitFor(() => {
            expect(getByText('30')).toBeTruthy();
            expect(getByText('min')).toBeTruthy();
            expect(getByText('5.3 km')).toBeTruthy();
            expect(getByText(/Arrive by/)).toBeTruthy();
        });
    });

    it('shows the see schedule action in shuttle mode', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: ['12:20', '13:00'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: 20,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        await waitFor(() => {
            expect(getByText('See schedule')).toBeTruthy();
        });
    });

    it('keeps the shuttle schedule modal open after the delayed directions effect runs', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: ['12:20', '13:00'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: 20,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        fireEvent.press(getByText('See schedule'));

        await waitFor(() => {
            expect(getByText('Shuttle Schedule')).toBeTruthy();
        });

        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        expect(getByText('Shuttle Schedule')).toBeTruthy();
    });

    it('shows both shuttle direction tabs in the schedule modal', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {
                departures: {
                    sgw: ['12:20', '13:00'],
                    loyola: ['12:40', '13:20'],
                },
            },
            departureTimes: ['12:20', '13:00'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: 20,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        fireEvent.press(getByText('See schedule'));

        await waitFor(() => {
            expect(getByText('To Loyola')).toBeTruthy();
            expect(getByText('To SGW')).toBeTruthy();
        });
    });

    it('falls back to Transit when shuttle is unavailable', async () => {
        const onModeChange = jest.fn();
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-24T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: [],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: true,
            isNextServiceDay: true,
            showSeeMoreButton: false,
            departures: [],
        });

        const {getByText} = render(
            <NavigationBottom
                origin={origin}
                destination={destination}
                initialMode="Shuttle"
                onModeChange={onModeChange}
            />
        );

        fireEvent.press(getByText('Check Transit'));
        expect(onModeChange).toHaveBeenCalledWith('Transit');
    });

    it('falls back to Transit when shuttle service starts later today', async () => {
        const onModeChange = jest.fn();
        const earlyMorning = new Date(2026, 1, 23, 0, 2, 0, 0);
        jest.setSystemTime(earlyMorning);
        getCurrentTimeISO.mockReturnValue(earlyMorning.toISOString());

        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date(2026, 1, 23, 0, 0, 0, 0),
            schedule: {departures: {sgw: ['07:00', '07:30'], loyola: ['07:15', '07:45']}},
            departureTimes: ['07:00', '07:30'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '07:00',
                    departureDate: new Date(2026, 1, 23, 7, 0, 0, 0),
                    minutesUntil: 298,
                    minutesFromFilter: 298,
                },
            ],
        });

        const {getByText} = render(
            <NavigationBottom
                origin={origin}
                destination={destination}
                initialMode="Shuttle"
                onModeChange={onModeChange}
            />
        );

        expect(getByText('Shuttles are not running at the moment — need a ride now?')).toBeTruthy();
        expect(getByText('See schedule')).toBeTruthy();

        fireEvent.press(getByText('Check Transit'));
        expect(onModeChange).toHaveBeenCalledWith('Transit');
    });

    it('shows shuttle availability again when the selected time is during shuttle hours', async () => {
        const earlyMorning = new Date(2026, 1, 23, 0, 14, 0, 0);
        jest.setSystemTime(earlyMorning);
        getCurrentTimeISO.mockReturnValueOnce(earlyMorning.toISOString());

        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date(2026, 1, 23, 0, 0, 0, 0),
            schedule: {departures: {sgw: ['07:00', '07:20', '07:35'], loyola: ['07:10', '07:25', '07:40']}},
            departureTimes: ['07:00', '07:20', '07:35'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '07:00',
                    departureDate: new Date(2026, 1, 23, 7, 0, 0, 0),
                    minutesUntil: 406,
                    minutesFromFilter: -60,
                },
                {
                    time: '07:20',
                    departureDate: new Date(2026, 1, 23, 7, 20, 0, 0),
                    minutesUntil: 426,
                    minutesFromFilter: -40,
                },
                {
                    time: '07:35',
                    departureDate: new Date(2026, 1, 23, 7, 35, 0, 0),
                    minutesUntil: 441,
                    minutesFromFilter: -25,
                },
            ],
        });

        const {getByText, getByTestId, queryByText} = render(
            <NavigationBottom
                origin={origin}
                destination={destination}
                initialMode="Shuttle"
            />
        );

        fireEvent.press(getByTestId('depart-at-button'));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        expect(queryByText('Shuttles are not running at the moment — need a ride now?')).toBeNull();
        expect(getByText('See schedule')).toBeTruthy();
        expect(getByText('Start')).toBeTruthy();
    });

    it('falls back to Walk when route is on the same campus', async () => {
        const onModeChange = jest.fn();
        validateCampusRoute.mockReturnValue({
            valid: true,
            route: {isInterCampus: false},
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: [],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [],
        });

        const {getByText} = render(
            <NavigationBottom
                origin={origin}
                destination={destination}
                initialMode="Shuttle"
                onModeChange={onModeChange}
            />
        );

        fireEvent.press(getByText('Switch to Walk'));
        expect(onModeChange).toHaveBeenCalledWith('Walk');
    });

    it('flags when the recommended option is the last shuttle for the day', async () => {
        useShuttleRouting.mockReturnValue({
            walkToStop: {durationSeconds: 600, distanceMeters: 200},
            shuttleLeg: {durationSeconds: 900, distanceMeters: 5000},
            walkFromStop: {durationSeconds: 300, distanceMeters: 100},
            stopsForTrip: null,
            stopMarkers: [],
        });
        useShuttleSchedule.mockReturnValue({
            serviceDate: new Date('2026-02-23T00:00:00.000Z'),
            schedule: {departures: {sgw: [], loyola: []}},
            departureTimes: ['17:30', '18:15'],
            directionLabel: 'SGW -> Loyola',
            showNextServiceLabel: false,
            isNextServiceDay: false,
            showSeeMoreButton: false,
            departures: [
                {
                    time: '18:15',
                    departureDate: new Date('2026-02-23T18:15:00.000Z'),
                    minutesUntil: 30,
                    minutesFromFilter: 30,
                },
            ],
        });

        render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        await waitFor(() => {
            expect(screen.getByText('Last shuttle for the day')).toBeTruthy();
        });
    });
});
