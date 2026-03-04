import React from 'react';
import { render } from '@testing-library/react-native';
import { FloorIndicator } from '@/components/indoor/floor-indicator';

describe('FloorIndicator', () => {
  it('does not render when both building and floor are missing', () => {
    const { queryByTestId } = render(<FloorIndicator buildingCode={null} floorLabel={null} />);
    expect(queryByTestId('floor-indicator')).toBeNull();
  });

  it('renders building and current floor label', () => {
    const { getByTestId, getByText } = render(<FloorIndicator buildingCode="H" floorLabel="L2" />);

    expect(getByTestId('floor-indicator')).toBeTruthy();
    expect(getByText('H Building')).toBeTruthy();
    expect(getByText('Current floor: L2')).toBeTruthy();
  });
});
