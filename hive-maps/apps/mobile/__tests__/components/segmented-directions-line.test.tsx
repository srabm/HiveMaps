import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SegmentedDirectionsLine } from '@/components/ui/segmented-directions-line';
import { buildRouteVisualSegments } from '@/services/maps/route-visuals';

const treeHasStyleValue = (
  node: any,
  key: 'top' | 'bottom',
  value: number,
): boolean => {
  if (!node) return false;
  if (Array.isArray(node)) return node.some((child) => treeHasStyleValue(child, key, value));
  const flattened = StyleSheet.flatten(node.props?.style);
  if (flattened && flattened[key] === value) return true;
  if (!node.children) return false;
  return node.children.some((child: any) => treeHasStyleValue(child, key, value));
};

const mockShapeSource = jest.fn(({ children }: any) => <>{children}</>);
const mockLineLayer = jest.fn(({ id, style }: any) => {
  const { View } = require('react-native');
  return <View testID={id} style={style} />;
});
const mockCircleLayer = jest.fn(({ id, style }: any) => {
  const { View } = require('react-native');
  return <View testID={id} style={style} />;
});

jest.mock('@/services/mapbox', () => ({
  MapboxGL: {
    ShapeSource: (props: any) => mockShapeSource(props),
    LineLayer: (props: any) => mockLineLayer(props),
    CircleLayer: (props: any) => mockCircleLayer(props),
  },
}));

jest.mock('@/services/maps/route-visuals', () => ({
  buildRouteVisualSegments: jest.fn(),
}));

const mockedBuildRouteVisualSegments = buildRouteVisualSegments as jest.MockedFunction<
  typeof buildRouteVisualSegments
>;

const makeDirections = (overrides = {}) => ({
  distanceMeters: 2500,
  durationSeconds: 1800,
  polyline: 'mock-polyline',
  steps: [],
  ...overrides,
});

describe('SegmentedDirectionsLine', () => {
  beforeEach(() => {
    mockShapeSource.mockClear();
    mockLineLayer.mockClear();
    mockCircleLayer.mockClear();
    mockedBuildRouteVisualSegments.mockReset();
  });

  it('returns null when there are no segments', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([]);
    const { toJSON } = render(
      <SegmentedDirectionsLine directions={makeDirections()} mode="Transit" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders one line layer per segment and applies dash fallback', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [[-73.58, 45.49], [-73.57, 45.49]],
        color: '#e5a712',
        lineWidth: 8,
      },
      {
        coordinates: [[-73.57, 45.49], [-73.56, 45.5]],
        color: '#6B7280',
        lineWidth: 6,
        lineDasharray: [2, 2],
      },
    ]);

    render(<SegmentedDirectionsLine directions={makeDirections()} mode="Drive" />);

    expect(mockShapeSource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'directions-segmented-source-0' }),
    );
    expect(mockShapeSource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'directions-segmented-source-1' }),
    );
    expect(mockLineLayer.mock.calls[0][0].style.lineDasharray).toEqual([1, 0]);
    expect(mockLineLayer.mock.calls[1][0].style.lineDasharray).toEqual([2, 2]);
  });

  it('renders endpoints from first and last coordinates', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [[-73.58, 45.49], [-73.57, 45.49]],
        color: '#e5a712',
        lineWidth: 8,
      },
      {
        coordinates: [[-73.57, 45.49], [-73.56, 45.5]],
        color: '#00853F',
        lineWidth: 7,
      },
    ]);

    render(<SegmentedDirectionsLine directions={makeDirections()} mode="Transit" />);

    const endpointsSource = mockShapeSource.mock.calls.find(
      (call) => call[0].id === 'directions-segmented-endpoints-source',
    );
    expect(endpointsSource).toBeTruthy();
    expect(endpointsSource?.[0].shape.features).toEqual([
      expect.objectContaining({
        id: 'start-point',
        geometry: expect.objectContaining({ coordinates: [-73.58, 45.49] }),
      }),
      expect.objectContaining({
        id: 'end-point',
        geometry: expect.objectContaining({ coordinates: [-73.56, 45.5] }),
      }),
    ]);
    expect(mockCircleLayer.mock.calls[0][0].style.circleColor).toBe('#e5a712');
  });

  it('does not render endpoints when showEndpoints is false', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [[-73.58, 45.49], [-73.57, 45.49]],
        color: '#e5a712',
        lineWidth: 8,
      },
    ]);

    render(
      <SegmentedDirectionsLine
        directions={makeDirections()}
        mode="Drive"
        showEndpoints={false}
      />,
    );

    const ids = mockShapeSource.mock.calls.map((call) => call[0].id as string);
    expect(ids.some((id) => id.includes('endpoints-source'))).toBe(false);
  });

  it('handles empty segment coordinates without endpoint source', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [],
        color: '#e5a712',
        lineWidth: 8,
      },
    ]);

    render(<SegmentedDirectionsLine directions={makeDirections()} mode="Drive" />);

    const ids = mockShapeSource.mock.calls.map((call) => call[0].id as string);
    expect(ids.some((id) => id.includes('endpoints-source'))).toBe(false);
  });

  it('respects showStartEndpoint/showEndEndpoint flags', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [[-73.58, 45.49], [-73.57, 45.49]],
        color: '#e5a712',
        lineWidth: 8,
      },
    ]);

    render(
      <SegmentedDirectionsLine
        directions={makeDirections()}
        mode="Drive"
        showStartEndpoint={false}
        showEndEndpoint={true}
      />,
    );

    const endpointsSource = mockShapeSource.mock.calls.find(
      (call) => call[0].id === 'directions-segmented-endpoints-source',
    );
    expect(endpointsSource?.[0].shape.features).toEqual([
      expect.objectContaining({ id: 'end-point' }),
    ]);
  });

  it('renders and positions info card, and can hide it', () => {
    mockedBuildRouteVisualSegments.mockReturnValue([
      {
        coordinates: [[-73.58, 45.49], [-73.57, 45.49]],
        color: '#e5a712',
        lineWidth: 8,
      },
    ]);

    const { queryByText, rerender, toJSON } = render(
      <SegmentedDirectionsLine
        directions={makeDirections({ distanceMeters: 450, durationSeconds: 600 })}
        mode="Walk"
        showInfoCard={false}
      />,
    );
    expect(queryByText('Distance')).toBeNull();

    rerender(
      <SegmentedDirectionsLine
        directions={makeDirections({ distanceMeters: 450, durationSeconds: 600 })}
        mode="Walk"
        showInfoCard={true}
        infoCardPosition="top"
      />,
    );
    expect(queryByText('Distance')).toBeTruthy();
    expect(queryByText('Duration')).toBeTruthy();
    expect(queryByText('450 m')).toBeTruthy();
    expect(queryByText('10 min')).toBeTruthy();
    expect(treeHasStyleValue(toJSON(), 'top', 20)).toBe(true);
  });
});
