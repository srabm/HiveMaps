import {POICategory} from "@/components/ui/POICategory";
import { mapboxMapsAdapter } from "@/services/mapbox";
import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';

jest.mock('@/services/mapbox', () => ({
    mapboxMapsAdapter: {
        categorySearch: jest.fn(),
    },
}));

const mockPOIs = [
    {
        name: "Testing cafe",
        full_address: "testing Street",
        coordinates: { latitude: 45.5, longitude: -73.5 },
    },
];
beforeEach(() => {

    jest.clearAllMocks();
});

const mockCategorySearch = mapboxMapsAdapter.categorySearch as jest.Mock;

it('renders overall POICategory', async () => {
    const { getByText,queryByText } = render(
        <POICategory
            userLocation={[-73.5, 45.5]}
            radius={0.8}
        />
    );
    expect(getByText('Restaurants')).toBeTruthy();
    expect(getByText('Coffee Shops')).toBeTruthy();
    expect(getByText('Pharmacy')).toBeTruthy();
    expect(queryByText('✕')).toBeNull();

});

it('renders overall POICategory when userlocation is null', async () => {
    const { getByText,queryByText } = render(
        <POICategory
            userLocation={null}
            radius={0.8}
        />
    );
    expect(getByText('Restaurants')).toBeTruthy();
    expect(getByText('Coffee Shops')).toBeTruthy();
    expect(getByText('Pharmacy')).toBeTruthy();
    expect(queryByText('✕')).toBeNull();

});

it('does not call API when userLocation is null', () => {
    const { getByText } = render(
        <POICategory userLocation={null} />
    );

    fireEvent.press(getByText('Restaurants'));

    expect(mockCategorySearch).not.toHaveBeenCalled();
});

it('calls onSelectCategory with correct category and POIs', async () => {

    mockCategorySearch.mockResolvedValue(mockPOIs);

    const onSelectCategory = jest.fn();

    const { getByText } = render(
        <POICategory
            userLocation={[-73.5, 45.5]}
            onSelectCategory={onSelectCategory}
        />
    );

    fireEvent.press(getByText('Restaurants'));

    await waitFor(() => {
        expect(onSelectCategory).toHaveBeenCalledTimes(1);
        expect(onSelectCategory).toHaveBeenCalledWith('restaurant', mockPOIs);
        expect(mockCategorySearch).toHaveBeenCalledWith(
            'restaurant',
            [-73.5, 45.5],
            expect.any(Number),
            expect.any(Number),
            expect.any(Number),
            expect.any(Number)
        );
    });
});

it('does not call onSelectCategory when API fails', async () => {

    mockCategorySearch.mockRejectedValue(new Error('API call failure'));

    const onSelectCategory = jest.fn();

    const { getByText } = render(
        <POICategory
            userLocation={[-73.5, 45.5]}
            onSelectCategory={onSelectCategory}
            radius={0.8}
        />
    );

    fireEvent.press(getByText('Restaurants'));

    await waitFor(() => {
        expect(onSelectCategory).not.toHaveBeenCalled();
    });
});

it('calls onSelectCategory with correct category and POIs and press the same button again', async () => {

    mockCategorySearch.mockResolvedValue(mockPOIs);

    const onSelectCategory = jest.fn();
    const onClearCategory = jest.fn();
    const { getByText, queryByText  } = render(
        <POICategory
            userLocation={[-73.5, 45.5]}
            onSelectCategory={onSelectCategory}
            onClearCategory={onClearCategory}
            radius={0.8}
        />
    );

    fireEvent.press(getByText('Restaurants'));
    await waitFor(() => {
        expect(onSelectCategory).toHaveBeenCalledTimes(1);
        expect(onSelectCategory).toHaveBeenCalledWith('restaurant', mockPOIs);
        expect(getByText('✕')).toBeTruthy();
    });


    fireEvent.press(getByText('Restaurants'));
    await waitFor(() => {
        expect(onClearCategory).toHaveBeenCalledTimes(1);
        expect(queryByText('✕')).toBeNull();
    });
});
