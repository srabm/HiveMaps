import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FloorSelector } from '@/components/indoor/floor-selector';

const floors = [
  { id: '1', label: 'L1', sortOrder: 1 },
  { id: '2', label: 'L2', sortOrder: 2 },
];

describe('FloorSelector', () => {
  it('renders floor chips and active state marker', () => {
    const { getByTestId } = render(
      <FloorSelector floors={floors} activeFloorId="2" onSelectFloor={jest.fn()} />
    );

    expect(getByTestId('floor-selector')).toBeTruthy();
    expect(getByTestId('floor-chip-1')).toBeTruthy();
    expect(getByTestId('floor-chip-2')).toBeTruthy();
    expect(getByTestId('floor-chip-2-active')).toBeTruthy();
  });

  it('calls onSelectFloor when selecting an inactive chip', () => {
    const onSelectFloor = jest.fn();
    const { getByTestId } = render(
      <FloorSelector floors={floors} activeFloorId="2" onSelectFloor={onSelectFloor} />
    );

    fireEvent.press(getByTestId('floor-chip-1'));
    expect(onSelectFloor).toHaveBeenCalledWith('1');
  });

  it('disables floor chips when selector is disabled', () => {
    const onSelectFloor = jest.fn();
    const { getByTestId } = render(
      <FloorSelector floors={floors} activeFloorId="2" onSelectFloor={onSelectFloor} disabled />
    );

    fireEvent.press(getByTestId('floor-chip-1'));
    expect(onSelectFloor).not.toHaveBeenCalled();
  });
});
