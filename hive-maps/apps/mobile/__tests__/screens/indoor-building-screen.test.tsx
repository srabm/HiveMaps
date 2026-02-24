import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import IndoorMapScreen from '@/app/indoor/[building]';

const mockUseLocalSearchParams = jest.fn();
const mockBack = jest.fn();
const mockFetchBuildingFloors = jest.fn();
const mockFetchFloorDetails = jest.fn();
const mockParseIndoorBuildingCode = jest.fn();
const mockGetCampusIdForIndoorBuilding = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/services/http/indoor-api', () => ({
  fetchBuildingFloors: (...args: unknown[]) => mockFetchBuildingFloors(...args),
  fetchFloorDetails: (...args: unknown[]) => mockFetchFloorDetails(...args),
  parseIndoorBuildingCode: (...args: unknown[]) => mockParseIndoorBuildingCode(...args),
  getCampusIdForIndoorBuilding: (...args: unknown[]) => mockGetCampusIdForIndoorBuilding(...args),
}));

jest.mock('@/components/indoor/floor-plan-viewer', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    FloorPlanViewer: ({ planGeometry, rooms, selectedRoomId, onPressRoom }: any) => (
      <View testID="mock-floor-plan-viewer">
        <Text>{`PlanType:${planGeometry?.type ?? 'none'}`}</Text>
        <Text>{`RoomCount:${rooms?.features?.length ?? 0}`}</Text>
        <Text>{`Selected:${selectedRoomId ?? 'none'}`}</Text>
        <Pressable testID="mock-room-press" onPress={() => onPressRoom?.('R-101')}>
          <Text>Select Room</Text>
        </Pressable>
      </View>
    ),
  };
});

const makeFloorDetails = (floorId: string, floorLabel: string) => ({
  buildingCode: 'H',
  floor: { id: floorId, label: floorLabel },
  planGeometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-73.58, 45.49],
        [-73.579, 45.49],
        [-73.579, 45.491],
        [-73.58, 45.491],
        [-73.58, 45.49],
      ],
    ],
  },
  rooms: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: `R-${floorId}`,
        properties: { label: `R-${floorId}` },
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
  },
});

describe('Indoor building screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocalSearchParams.mockReturnValue({ building: 'H' });
    mockParseIndoorBuildingCode.mockImplementation((value: string | null | undefined) => {
      if (!value) return null;
      return String(value).toUpperCase();
    });
    mockGetCampusIdForIndoorBuilding.mockReturnValue('SGW');
  });

  it('uses valid floor query param and wires floor details into the viewer', async () => {
    mockUseLocalSearchParams.mockReturnValue({ building: 'H', floor: '2' });
    mockFetchBuildingFloors.mockResolvedValue([
      { id: '1', label: 'L1', sortOrder: 1 },
      { id: '2', label: 'L2', sortOrder: 2 },
    ]);
    mockFetchFloorDetails.mockResolvedValue(makeFloorDetails('2', 'L2'));

    const { getByText, getByTestId } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchBuildingFloors).toHaveBeenCalledWith('SGW', 'H');
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '2');
    });

    expect(getByTestId('floor-chip-2-active')).toBeTruthy();
    expect(getByText('Current floor: L2')).toBeTruthy();
    expect(getByText('PlanType:Polygon')).toBeTruthy();
    expect(getByText('RoomCount:1')).toBeTruthy();
  });

  it('shows unsupported-building message when building code is invalid', async () => {
    mockUseLocalSearchParams.mockReturnValue({ building: 'UNKNOWN' });
    mockParseIndoorBuildingCode.mockReturnValue(null);

    const { getByText } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(getByText('This building does not currently support indoor maps.')).toBeTruthy();
    });

    expect(mockFetchBuildingFloors).not.toHaveBeenCalled();
    expect(mockFetchFloorDetails).not.toHaveBeenCalled();
  });

  it('falls back to default floor for an invalid floor query and shows notice', async () => {
    mockUseLocalSearchParams.mockReturnValue({ building: 'H', floor: '99' });
    mockFetchBuildingFloors.mockResolvedValue([
      { id: '1', label: 'L1', sortOrder: 1 },
      { id: '2', label: 'L2', sortOrder: 2 },
    ]);
    mockFetchFloorDetails.mockImplementation(
      async (_campusId: string, _buildingCode: string, floorId: string) => makeFloorDetails(floorId, `L${floorId}`)
    );

    const { getByText, getByTestId } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '1');
    });

    expect(getByText('Floor 99 is unavailable. Showing L1.')).toBeTruthy();
    expect(getByTestId('floor-chip-1-active')).toBeTruthy();
  });

  it('supports room selection flow and clears selection when floor changes', async () => {
    mockFetchBuildingFloors.mockResolvedValue([
      { id: '1', label: 'L1', sortOrder: 1 },
      { id: '2', label: 'L2', sortOrder: 2 },
    ]);
    mockFetchFloorDetails.mockImplementation(
      async (_campusId: string, _buildingCode: string, floorId: string) => makeFloorDetails(floorId, `L${floorId}`)
    );

    const { getByText, getByTestId } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '1');
    });
    expect(getByText('Selected:none')).toBeTruthy();

    fireEvent.press(getByTestId('mock-room-press'));
    await waitFor(() => {
      expect(getByText('Selected:R-101')).toBeTruthy();
    });

    fireEvent.press(getByTestId('floor-chip-2'));
    await waitFor(() => {
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '2');
      expect(getByText('Selected:none')).toBeTruthy();
    });
  });

  it('switches to another available floor when the current floor details are missing', async () => {
    mockFetchBuildingFloors.mockResolvedValue([
      { id: '1', label: 'L1', sortOrder: 1 },
      { id: '2', label: 'L2', sortOrder: 2 },
    ]);
    mockFetchFloorDetails.mockImplementation(async (_campusId: string, _buildingCode: string, floorId: string) => {
      if (floorId === '1') return null;
      return makeFloorDetails('2', 'L2');
    });

    const { getByText, getByTestId } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '1');
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '2');
    });

    expect(getByText('Floor 1 is unavailable. Switched to L2.')).toBeTruthy();
    expect(getByTestId('floor-chip-2-active')).toBeTruthy();
    expect(getByText('Current floor: L2')).toBeTruthy();
  });

  it('shows error when all available floors are missing details', async () => {
    mockFetchBuildingFloors.mockResolvedValue([
      { id: '1', label: 'L1', sortOrder: 1 },
      { id: '2', label: 'L2', sortOrder: 2 },
    ]);
    mockFetchFloorDetails.mockResolvedValue(null);

    const { getByText } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '1');
      expect(mockFetchFloorDetails).toHaveBeenCalledWith('SGW', 'H', '2');
    });

    expect(getByText('Floor 2 is unavailable.')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('shows no-floors state when API returns an empty floor list', async () => {
    mockFetchBuildingFloors.mockResolvedValue([]);

    const { getByText } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(mockFetchBuildingFloors).toHaveBeenCalledWith('SGW', 'H');
    });

    expect(getByText('No floors are available for this building yet.')).toBeTruthy();
    expect(mockFetchFloorDetails).not.toHaveBeenCalled();
  });

  it('shows floor-list error and retry re-triggers loading', async () => {
    mockFetchBuildingFloors.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);

    const { getByText } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(getByText('Could not load available floors. Please try again.')).toBeTruthy();
    });

    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(mockFetchBuildingFloors).toHaveBeenCalledTimes(2);
    });
  });

  it('shows floor-details error when selected floor request fails', async () => {
    mockFetchBuildingFloors.mockResolvedValue([{ id: '1', label: 'L1', sortOrder: 1 }]);
    mockFetchFloorDetails.mockRejectedValue(new Error('network'));

    const { getByText } = render(<IndoorMapScreen />);

    await waitFor(() => {
      expect(getByText('Could not load floor 1. Please try again.')).toBeTruthy();
    });
  });
});
