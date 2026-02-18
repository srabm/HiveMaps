import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { BuildingInfoModal } from '@/components/building-info-modal';

jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);

describe('BuildingInfoModal', () => {
  const baseBuilding = {
    name: 'Hall Building',
    addresses: ['1455 De Maisonneuve Blvd W'],
    campus: 'SGW',
    hours: 'Mon-Fri 8:00-18:00',
    phone: '+1 514-000-0000',
    website: 'https://example.org',
  };

  it('renders fallback content when no building is selected', () => {
    const { getByText } = render(
      <BuildingInfoModal visible building={null} onClose={jest.fn()} />
    );

    expect(getByText('Selected Building')).toBeTruthy();
    expect(getByText('Address unavailable')).toBeTruthy();
    expect(getByText('Hours not listed')).toBeTruthy();
    expect(getByText('Phone not listed')).toBeTruthy();
    expect(getByText('Website not listed')).toBeTruthy();
    expect(getByText('Building photo')).toBeTruthy();
  });

  it('calls action handlers when action buttons are pressed', () => {
    const onDirections = jest.fn();
    const onStart = jest.fn();
    const onFavorite = jest.fn();

    const { getByText } = render(
      <BuildingInfoModal
        visible
        building={baseBuilding}
        onClose={jest.fn()}
        onDirections={onDirections}
        onStart={onStart}
        onFavorite={onFavorite}
      />
    );

    fireEvent.press(getByText('Directions'));
    fireEvent.press(getByText('Start'));
    fireEvent.press(getByText('Favourites'));

    expect(onDirections).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onFavorite).toHaveBeenCalledTimes(1);
  });

  it('uses fallback accessibility items when accessibility details are missing', () => {
    const { getByText } = render(
      <BuildingInfoModal visible building={baseBuilding} onClose={jest.fn()} />
    );

    expect(getByText('Accessible entrance')).toBeTruthy();
    expect(getByText('Accessible elevator')).toBeTruthy();
  });
});
