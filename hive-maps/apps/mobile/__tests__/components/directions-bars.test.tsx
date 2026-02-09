import DirectionBar from "@/components/directions-bars";
import { MapLocation, MapsProviderPort } from "@/services/maps/maps-provider";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

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

describe("DirectionBar tests", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders 'from' input with value and placeholder", () => {
    const { getByPlaceholderText } = render(
      <DirectionBar
        fromValue='Hall'
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    const input = getByPlaceholderText("Choose starting point");
    expect(input.props.value).toBe("Hall");
  });

  it("renders 'to' input with value and placeholder", () => {
    const { getByPlaceholderText } = render(
      <DirectionBar
        fromValue=''
        toValue='Hall'
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    const input = getByPlaceholderText("Choose destination");
    expect(input.props.value).toBe("Hall");
  });

  it("calls onChangeFrom when 'from' is changed", () => {
    const onChangeFrom = jest.fn();
    const { getByPlaceholderText } = render(
      <DirectionBar
        fromValue=''
        toValue=''
        onChangeFrom={onChangeFrom}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent.changeText(
      getByPlaceholderText("Choose starting point"),
      "Hall"
    );

    expect(onChangeFrom).toHaveBeenCalledWith("Hall");
  });

  it("calls onChangeTo when 'to' is changed", () => {
    const onChangeTo = jest.fn();
    const { getByPlaceholderText } = render(
      <DirectionBar
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={onChangeTo}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent.changeText(
      getByPlaceholderText("Choose destination"),
      "Hall"
    );

    expect(onChangeTo).toHaveBeenCalledWith("Hall");
  });

  it("renders 'from' suggestions", async () => {
    const mapsAdapter = createMapsAdapter();
    const { getByPlaceholderText, getByText } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue='Hall'
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent(getByPlaceholderText("Choose starting point"), "focus");
    
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(getByText("Hall Building")).toBeTruthy();
      expect(getByText("EV Building")).toBeTruthy();
    });
  });

  it("renders 'to' suggestions", async () => {
    const mapsAdapter = createMapsAdapter();
    const { getByPlaceholderText, getByText } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue=''
        toValue='Hall'
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent(getByPlaceholderText("Choose destination"), "focus");
    
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(getByText("Hall Building")).toBeTruthy();
      expect(getByText("EV Building")).toBeTruthy();
    });
  });

  it("selects a building and fetches coordinates ('from' input)", async () => {
    const mapsAdapter = createMapsAdapter();
    const onSelectBuilding = jest.fn();

    const { getByText, getByPlaceholderText } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue='Hall'
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={onSelectBuilding}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent(getByPlaceholderText("Choose starting point"), "focus");

    act(() => {
      jest.advanceTimersByTime(500);
    });

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

  it("selects a building and fetches coordinates ('to' input)", async () => {
    const mapsAdapter = createMapsAdapter();
    const onSelectBuilding = jest.fn();

    const { getByText, getByPlaceholderText } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue=''
        toValue='Hall'
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={onSelectBuilding}
        onResetFrom={jest.fn()}
      />
    );

    fireEvent(getByPlaceholderText("Choose destination"), "focus");

    act(() => {
      jest.advanceTimersByTime(500);
    });

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

  it("calls onClear when clear button is pressed ('from' input)", () => {
    const mapsAdapter = createMapsAdapter();
    const onClear = jest.fn();
    
    const { getByTestId } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
        onClearFrom={onClear}
      />
    );

    const button = getByTestId('clear-from');
    fireEvent.press(button);
    expect(onClear).toHaveBeenCalled();
  });

  it("calls onClear when clear button is pressed ('to' input)", () => {
    const mapsAdapter = createMapsAdapter();
    const onClear = jest.fn();
    
    const { getByTestId } = render(
      <DirectionBar
        mapsAdapter={mapsAdapter}
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
        onClearTo={onClear}
      />
    );

    const button = getByTestId('clear-to');
    fireEvent.press(button);
    expect(onClear).toHaveBeenCalled();
  });

  it('calls onResetFrom when reset button is pressed', () => {
    const onResetFrom = jest.fn();

    const { getByTestId } = render(
      <DirectionBar
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={onResetFrom}
      />
    );

    const button = getByTestId('reset-button');
    fireEvent.press(button);
    expect(onResetFrom).toHaveBeenCalled();
  });

  it('calls onSwap when swap button is pressed', () => {
    const onSwap = jest.fn();

    const { getByTestId } = render(
      <DirectionBar
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
        onSwap={onSwap}
      />
    );

    const button = getByTestId('swap-button');
    fireEvent.press(button);
    expect(onSwap).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DirectionBar
        fromValue=''
        toValue=''
        onChangeFrom={jest.fn()}
        onChangeTo={jest.fn()}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        onResetFrom={jest.fn()}
        onClose={onClose}
      />
    );

    const button = getByTestId('close-button');
    fireEvent.press(button);
    expect(onClose).toHaveBeenCalled();
  });
});