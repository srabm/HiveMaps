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
    const { getByText, queryByText } = render(
      <BuildingInfoModal visible building={null} onClose={jest.fn()} />
    );

    expect(getByText('Selected Building')).toBeTruthy();
    expect(getByText('Address unavailable')).toBeTruthy();
    expect(getByText('Hours not listed')).toBeTruthy();
    expect(getByText('Phone not listed')).toBeTruthy();
    expect(getByText('Website not listed')).toBeTruthy();
    expect(queryByText('Building photo')).toBeNull();
  });

  it('calls action handlers when action buttons are pressed', () => {
    const onDirections = jest.fn();

    const { getByText } = render(
      <BuildingInfoModal
        visible
        building={baseBuilding}
        onClose={jest.fn()}
        onDirections={onDirections}
      />
    );

    fireEvent.press(getByText('Directions'));

    expect(onDirections).toHaveBeenCalledTimes(1);
  });

  it('uses fallback accessibility items when accessibility details are missing', () => {
    const { getByText } = render(
      <BuildingInfoModal visible building={baseBuilding} onClose={jest.fn()} />
    );

    expect(getByText('Accessible entrance')).toBeTruthy();
    expect(getByText('Accessible elevator')).toBeTruthy();
  });

  it('renders indoor action for supported building and calls handler', () => {
    const onIndoorMap = jest.fn();
    const { getByText } = render(
      <BuildingInfoModal
        visible
        building={{ ...baseBuilding, code: 'H', hasIndoorMap: true }}
        onClose={jest.fn()}
        onIndoorMap={onIndoorMap}
      />
    );

    fireEvent.press(getByText('Indoor'));
    expect(onIndoorMap).toHaveBeenCalledTimes(1);
  });

  it('does not render indoor action for unsupported building', () => {
    const { queryByText } = render(
      <BuildingInfoModal
        visible
        building={{ ...baseBuilding, code: 'XYZ', hasIndoorMap: false }}
        onClose={jest.fn()}
      />
      );

    expect(queryByText('Indoor')).toBeNull();
  });
  
  it('renders allHours entries when provided', () => {
    const buildingWithAllHours = {
      ...baseBuilding,
      allHours: [
        'Monday: 8:00 AM - 6:00 PM',
        'Tuesday: 8:00 AM - 6:00 PM',
      ],
    };

    const { getByText, queryByText } = render(
      <BuildingInfoModal visible building={buildingWithAllHours as any} onClose={jest.fn()} />
    );

    expect(getByText('Monday: 8:00 AM - 6:00 PM')).toBeTruthy();
    expect(getByText('Tuesday: 8:00 AM - 6:00 PM')).toBeTruthy();
    expect(queryByText('Mon-Fri 8:00-18:00')).toBeNull();
  });

  it('minimizes to the summary view', () => {
    const { getByTestId, getByText, queryByText } = render(
      <BuildingInfoModal
        visible
        building={{ ...baseBuilding, hasIndoorMap: true }}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('building-minimize-button'));

    expect(getByTestId('building-modal-minimized')).toBeTruthy();
    expect(queryByText('Hours')).toBeNull();
    expect(queryByText('Accessibility')).toBeNull();
    expect(getByText('Directions')).toBeTruthy();
    expect(getByText('Indoor')).toBeTruthy();
    expect(queryByText('Start')).toBeNull();
    expect(queryByText('Favourites')).toBeNull();
  });

  it('calls onClose from the explicit close button', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BuildingInfoModal visible building={baseBuilding} onClose={onClose} />
    );

    fireEvent.press(getByTestId('building-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
