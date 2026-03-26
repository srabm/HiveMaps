// __tests__/OutdoorPOICard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OutdoorPOICard } from '@/components/ui/outdoor-poi-card';
import type { POI } from '@/components/ui/POICategory';
import * as routeValidator from '@/services/maps/route-validator';
jest.mock('@/services/maps/route-validator', () => ({
    haversineKM: jest.fn(() => 0.5),
}));
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
    MaterialIcons: 'MaterialIcons',
}));
describe('OutdoorPOICard', () => {
    const poi: POI = {
            name: 'Test Example',
        full_address: '123 Testing Street',
        coordinates: { latitude: 45.0, longitude: -73.0 },
        phone: '514-456-7890',
    };

    const userLocation = { latitude: 45.001, longitude: -73.001 };
    const onClose = jest.fn();
    const onGetDirections = jest.fn();
    const onStartNavigation = jest.fn();

    it('renders correctly and displays distance', () => {
        const { getByText, getByTestId } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={userLocation}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );

        expect(getByText('Test Example')).toBeTruthy();
        expect(getByText('123 Testing Street')).toBeTruthy();
        expect(getByText('500m')).toBeTruthy();
        expect(getByText('Directions')).toBeTruthy();
        expect(getByText('Start')).toBeTruthy();
        expect(getByText('Favourite')).toBeTruthy();
        expect(getByTestId('poi-card-close')).toBeTruthy();
        fireEvent.press(getByTestId('poi-card-close'));
        expect(onClose).toHaveBeenCalled();
    });

    it('calls direction and navigation handlers', () => {
        const { getByText } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={userLocation}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );

        fireEvent.press(getByText('Directions'));
        expect(onGetDirections).toHaveBeenCalled();

        fireEvent.press(getByText('Start'));
        expect(onStartNavigation).toHaveBeenCalled();
    });
});

describe('OutdoorPOICard', () => {
    const poi: POI = {
        name: 'Test POI',
        full_address: '123 Test Street',
        coordinates: { latitude: 45.0, longitude: -73.0 },
        phone: '123-456-7890',
    };

    const userLocation = { latitude: 45.001, longitude: -73.001 };
    const onClose = jest.fn();
    const onGetDirections = jest.fn();
    const onStartNavigation = jest.fn();

    it('handles all pressables and favourite toggle', () => {
        const { getByText, getByTestId } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={userLocation}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );
        expect(getByText('500m')).toBeTruthy();
        expect(getByText('123-456-7890')).toBeTruthy();

        fireEvent.press(getByTestId('poi-card-close'));
        expect(onClose).toHaveBeenCalled();

        fireEvent.press(getByText('Directions'));
        expect(onGetDirections).toHaveBeenCalled();

        fireEvent.press(getByText('Start'));
        expect(onStartNavigation).toHaveBeenCalled();
    });
});

describe('OutdoorPOICard distanceText', () => {
    const poi: POI = {
        name: 'Test POI',
        full_address: '123 Test Street',
        coordinates: { latitude: 45.0, longitude: -73.0 },
        phone: '123-456-7890',
    };

    const onClose = jest.fn();
    const onGetDirections = jest.fn();
    const onStartNavigation = jest.fn();

    it('shows distance in meters when < 1km', () => {
        jest.spyOn(routeValidator, 'haversineKM').mockReturnValue(0.42);

        const { getByText } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={{ latitude: 45.001, longitude: -73.001 }}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );
        expect(getByText('420m')).toBeTruthy();
    });

    it('shows distance in km when >= 1km', () => {
        jest.spyOn(routeValidator, 'haversineKM').mockReturnValue(2.38);

        const { getByText } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={{ latitude: 45.001, longitude: -73.001 }}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );
        expect(getByText('2.4km')).toBeTruthy();
    });

    it('does not show distance when userLocation is null', () => {
        const { queryByText } = render(
            <OutdoorPOICard
                poi={poi}
                userLocation={null}
                onClose={onClose}
                onGetDirections={onGetDirections}
                onStartNavigation={onStartNavigation}
            />
        );

        expect(queryByText(/m|km/)).toBeNull();
    });
});