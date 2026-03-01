import React from 'react';
import {fireEvent, render, waitFor, act} from '@testing-library/react-native';
import {NavigationBottom} from '../../components/ui/navigation-bottom';
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

        fireEvent.press(getByText(/Depart at:/));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(getByText('Depart at 12:35')).toBeTruthy();
        });
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

        await waitFor(() => {
            expect(getByText('in 1 hr 30 min')).toBeTruthy();
            expect(getByText('in 2 hr 10 min')).toBeTruthy();
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

    it('filters unreachable departures in arrive mode using shuttle and final walk time', async () => {
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
                    time: '12:40',
                    departureDate: new Date('2026-02-23T12:40:00.000Z'),
                    minutesUntil: 40,
                    minutesFromFilter: -10,
                },
                {
                    time: '12:20',
                    departureDate: new Date('2026-02-23T12:20:00.000Z'),
                    minutesUntil: 20,
                    minutesFromFilter: -25,
                },
            ],
        });

        const {getByText, getByTestId} = render(
            <NavigationBottom origin={origin} destination={destination} initialMode="Shuttle" />
        );

        fireEvent.press(getByText(/Depart at:/));
        fireEvent.press(getByTestId('confirm-arrive-time'));

        await waitFor(() => {
            const lastSectionProps = ShuttleScheduleSection.mock.calls[ShuttleScheduleSection.mock.calls.length - 1][0];
            expect(lastSectionProps.departures).toHaveLength(1);
            expect(lastSectionProps.departures[0].etaLabel).toBe('Now');
        });
    });
    // task-2.6.7: fallback to alternative modes when unavailable
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
});
