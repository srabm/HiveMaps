import React from 'react';
import {render} from '@testing-library/react-native';
import {ShuttleRouteOverlay} from '@/components/ui/shuttle-route-overlay';
import {SHUTTLE_STOPS} from '@/services/data/shuttle-stops';

// Mock MapboxGL to avoid native module requirements
jest.mock('@/services/mapbox', () => ({
    MapboxGL: {
        PointAnnotation: ({children, id}: any) => (
            <>{children}</>
        ),
    },
}));

// Mock DirectionsLine to avoid deep rendering
jest.mock('@/components/ui/directions-line', () => ({
    DirectionsLine: ({sourceId}: any) => {
        const {View} = require('react-native');
        return <View testID={sourceId} />;
    },
}));

const mockDirections = {
    distanceMeters: 500,
    durationSeconds: 300,
    polyline: 'mockPoly',
    steps: [],
};

const baseStopsForTrip = {
    originStop: SHUTTLE_STOPS.SGW,
    destinationStop: SHUTTLE_STOPS.LOY,
};

describe('ShuttleRouteOverlay — rendering legs', () => {
    it('renders nothing when all legs and stopsForTrip are null', () => {
        const {toJSON} = render(
            <ShuttleRouteOverlay
                walkToStop={null}
                shuttleLeg={null}
                walkFromStop={null}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(toJSON()).toBeNull();
    });

    it('renders walkToStop DirectionsLine when walkToStop is provided', () => {
        const {getByTestId} = render(
            <ShuttleRouteOverlay
                walkToStop={mockDirections}
                shuttleLeg={null}
                walkFromStop={null}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByTestId('shuttle-walk-to-source')).toBeTruthy();
    });

    it('renders shuttleLeg DirectionsLine when shuttleLeg is provided', () => {
        const {getByTestId} = render(
            <ShuttleRouteOverlay
                walkToStop={null}
                shuttleLeg={mockDirections}
                walkFromStop={null}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByTestId('shuttle-leg-source')).toBeTruthy();
    });

    it('renders walkFromStop DirectionsLine when walkFromStop is provided', () => {
        const {getByTestId} = render(
            <ShuttleRouteOverlay
                walkToStop={null}
                shuttleLeg={null}
                walkFromStop={mockDirections}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByTestId('shuttle-walk-from-source')).toBeTruthy();
    });

    it('renders all three leg lines when all are provided', () => {
        const {getByTestId} = render(
            <ShuttleRouteOverlay
                walkToStop={mockDirections}
                shuttleLeg={mockDirections}
                walkFromStop={mockDirections}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByTestId('shuttle-walk-to-source')).toBeTruthy();
        expect(getByTestId('shuttle-leg-source')).toBeTruthy();
        expect(getByTestId('shuttle-walk-from-source')).toBeTruthy();
    });
});

describe('ShuttleRouteOverlay — stop markers', () => {
    it('renders SGW and LOY stop markers when stopsForTrip is provided', () => {
        const {getByText} = render(
            <ShuttleRouteOverlay
                walkToStop={null}
                shuttleLeg={null}
                walkFromStop={null}
                stopsForTrip={baseStopsForTrip}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByText('SGW')).toBeTruthy();
        expect(getByText('LOY')).toBeTruthy();
    });

    it('does not render stop markers when stopsForTrip is null', () => {
        const {queryByText} = render(
            <ShuttleRouteOverlay
                walkToStop={null}
                shuttleLeg={null}
                walkFromStop={null}
                stopsForTrip={null}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(queryByText('SGW')).toBeNull();
        expect(queryByText('LOY')).toBeNull();
    });
});

describe('ShuttleRouteOverlay — full render', () => {
    it('renders all legs and stop markers together', () => {
        const {getByTestId, getByText} = render(
            <ShuttleRouteOverlay
                walkToStop={mockDirections}
                shuttleLeg={mockDirections}
                walkFromStop={mockDirections}
                stopsForTrip={baseStopsForTrip}
                stopMarkers={SHUTTLE_STOPS}
            />
        );
        expect(getByTestId('shuttle-walk-to-source')).toBeTruthy();
        expect(getByTestId('shuttle-leg-source')).toBeTruthy();
        expect(getByTestId('shuttle-walk-from-source')).toBeTruthy();
        expect(getByText('SGW')).toBeTruthy();
        expect(getByText('LOY')).toBeTruthy();
    });
});
