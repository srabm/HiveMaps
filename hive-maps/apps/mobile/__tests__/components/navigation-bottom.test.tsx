import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
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

const {getDirections} = require('@/services/maps/directions-api-adapter');
const origin = {latitude: 45.4972, longitude: -73.5787};
const destination = {latitude: 45.4583, longitude: -73.6406};

jest.useFakeTimers();

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