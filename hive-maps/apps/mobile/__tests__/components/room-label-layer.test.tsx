import React from 'react';
import { render } from '@testing-library/react-native';
import type * as GeoJSON from 'geojson';
import { RoomLabelLayer } from '@/components/indoor/room-label-layer';

jest.mock('@/services/mapbox', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    MapboxGL: {
      ShapeSource: ({ children, testID, id }: any) => <View testID={testID ?? id}>{children}</View>,
      SymbolLayer: ({ id }: any) => <Text>{id}</Text>,
    },
  };
});

const rooms: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'H-101',
      properties: { label: 'H-101' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.5799, 45.4901],
            [-73.5796, 45.4901],
            [-73.5796, 45.4904],
            [-73.5799, 45.4904],
            [-73.5799, 45.4901],
          ],
        ],
      },
    },
  ],
};

describe('RoomLabelLayer', () => {
  it('does not render when rooms are missing', () => {
    const { toJSON } = render(<RoomLabelLayer rooms={null} selectedRoomId={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders base room labels source/layer', () => {
    const { getByTestId, getByText, queryByText } = render(
      <RoomLabelLayer rooms={rooms} selectedRoomId={null} />,
    );

    expect(getByTestId('indoor-room-labels-source')).toBeTruthy();
    expect(getByText('indoor-room-labels')).toBeTruthy();
    expect(queryByText('indoor-room-selected-label')).toBeNull();
  });

  it('renders selected-room label layer when room is selected', () => {
    const { getByText } = render(<RoomLabelLayer rooms={rooms} selectedRoomId="H-101" />);
    expect(getByText('indoor-room-selected-label')).toBeTruthy();
  });
});
