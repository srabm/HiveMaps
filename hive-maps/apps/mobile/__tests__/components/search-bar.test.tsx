import MapSearchBar from "@/components/search-bar";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { MapsProviderPort, MapLocation } from "@/services/maps/maps-provider";
import React from "react";

jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: () => null,
  };
});

const mockSuggestions: MapLocation[] = [
  { id: '1', name: 'Hall Building', address: '1455 De Maisonneuve' },
  { id: '2', name: 'EV Building', address: '1515 Ste-Catherine' },
];

const createMapsAdapter = (): jest.Mocked<MapsProviderPort> => ({
  ensureConfigured: jest.fn().mockResolvedValue(null),
  geocode: jest.fn().mockResolvedValue(null),
  search: jest.fn().mockResolvedValue(mockSuggestions),
  retrieve: jest.fn().mockResolvedValue({ lat: 45.497, lng: -73.579 }),
  reverse: jest.fn().mockResolvedValue(null),
  forward: jest.fn().mockResolvedValue(null),
  defaultStyleURL: "",
});

describe('MapSearchBar tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders input with value and placeholder', () => {
    const { getByPlaceholderText } = render(
      <MapSearchBar toValue="Hall" />
    );

    const input = getByPlaceholderText('Search building or address');
    expect(input.props.value).toBe('Hall');
  });

  it('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();

    const { getByPlaceholderText } = render(
      <MapSearchBar toValue="" onChangeText={onChangeText} />
    );

    fireEvent.changeText(
      getByPlaceholderText('Search building or address'),
      'Hall'
    );

    expect(onChangeText).toHaveBeenCalledWith('Hall');
  });

  it('renders suggestions after successful search', async () => {
    const mapsAdapter = createMapsAdapter();

    const { getByText } = render(
      <MapSearchBar
        toValue="Hall"
        mapsAdapter={mapsAdapter}
      />
    );

    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(getByText('Hall Building')).toBeTruthy();
      expect(getByText('EV Building')).toBeTruthy();
    });
  });

  it('selects a building and fetches coordinates', async () => {
    const mapsAdapter = createMapsAdapter();
    const onSelectBuilding = jest.fn();

    const { getByText } = render(
      <MapSearchBar
        toValue="Hall"
        mapsAdapter={mapsAdapter}
        onSelectBuilding={onSelectBuilding}
      />
    );

    jest.advanceTimersByTime(500);

    const item = await waitFor(() => getByText('Hall Building'));

    fireEvent.press(item);

    await waitFor(() => {
      expect(mapsAdapter.retrieve).toHaveBeenCalledWith(
        '1',
        expect.any(String)
      );
    });

    await waitFor(() => {
      expect(onSelectBuilding).toHaveBeenCalledWith(
        mockSuggestions[0],
        { lat: 45.497, lng: -73.579 }
      );
    });
  });

  it('calls onClear when clear button is pressed', () => {
    const onClear = jest.fn();

    const { getByTestId } = render(
      <MapSearchBar
        toValue="Hall"
        onClear={onClear}
      />
    );

    const button = getByTestId('close-button');
    fireEvent.press(button);
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onClickButton when search button is pressed', () => {
    const onClickButton = jest.fn();

    const { getByTestId } = render(
      <MapSearchBar
        toValue=""
        onClickButton={onClickButton}
      />
    );

    const button = getByTestId('search-button');
    fireEvent.press(button);
    expect(onClickButton).toHaveBeenCalled();
  });
});
