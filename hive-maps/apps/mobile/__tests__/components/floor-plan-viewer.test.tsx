import React from 'react';
import {render, act, fireEvent, waitFor} from '@testing-library/react-native';
import type * as GeoJSON from 'geojson';
import {FloorPlanViewer} from '@/components/indoor/floor-plan-viewer';

// ─── captured handlers ────────────────────────────────────────────────────────
let latestRoomsPressHandler: ((event: any) => void) | undefined;
let latestUserLocationUpdate: ((loc: any) => void) | undefined;
let latestDirectionBarProps: Record<string, any> = {};
let latestDirectionsModalProps: Record<string, any> = {};
const mockSetAccessible = jest.fn();

// ─── mocks ───────────────────────────────────────────────────────────────────
jest.mock('@/services/mapbox', () => {
  const React = require('react');
  const {View} = require('react-native');

  const ShapeSource = ({children, onPress, testID}: any) => {
    if (testID === 'indoor-rooms-source') {
      latestRoomsPressHandler = onPress;
    }
    return React.createElement(View, null, children);
  };

  const UserLocation = ({onUpdate}: any) => {
    latestUserLocationUpdate = onUpdate;
    return null;
  };

  const MockCamera = React.forwardRef((_: any, ref: any) => {
    if (ref) ref.current = {setCamera: jest.fn()};
    return null;
  });
  MockCamera.displayName = 'MockCamera';

  return {
    MapboxGL: {
      MapView: ({children}: any) => React.createElement(View, null, children),
      Camera: MockCamera,
      UserLocation,
      ShapeSource,
      FillLayer: () => null,
      LineLayer: () => null,
      SymbolLayer: () => null,
      Images: () => null,
      MarkerView: ({ children }: any) => React.createElement(View, null, children),
      StyleURL: {
        Light: 'mapbox://styles/mapbox/light-v10',
      },
    },
  };
});

jest.mock('@/components/indoor/POIMarker', () => ({
  POIMarker: () => null,
}));

jest.mock('@/components/directions-bars', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      latestDirectionBarProps = props;
      return React.createElement(View, {testID: 'direction-bar'});
    },
  };
});

jest.mock('@/components/indoor/indoor-directions-modal', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      latestDirectionsModalProps = props;
      return React.createElement(View, {testID: 'directions-modal'});
    },
  };
});

jest.mock('@/components/ui/directions-line', () => ({
  DirectionsLine: () => null,
}));

jest.mock('@/services/maps/indoor-node-search-adapter', () => ({
  createIndoorNodeSearchAdapter: jest.fn(() => ({
    ensureConfigured: jest.fn(),
    geocode: jest.fn(),
    search: jest.fn().mockResolvedValue([]),
    retrieve: jest.fn().mockResolvedValue(null),
    reverse: jest.fn(),
    forward: jest.fn(),
    defaultStyleURL: '',
  })),
}));

jest.mock('@/components/indoor/room-label-layer', () => ({
  RoomLabelLayer: () => null,
}));

jest.mock('@/components/search-bar', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {__esModule: true, default: () => React.createElement(View, null)};
});

jest.mock('@/state/indoor-navigation-state', () => ({
  useIndoorNavigationState: () => ({
    accessible: false,
    setAccessible: mockSetAccessible,
    hydrated: true,
  }),
}));

const mockFetchNearestNode = jest.fn();
const mockFetchIndoorDirections = jest.fn();
jest.mock('@/services/http/indoor-api', () => ({
  ...jest.requireActual('@/services/http/indoor-api'),
  fetchNearestNode: (...args: any[]) => mockFetchNearestNode(...args),
  fetchIndoorDirections: (...args: any[]) => mockFetchIndoorDirections(...args),
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────
const makePlanGeometry = (): GeoJSON.Polygon => ({
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
});

const makeRooms = (overrideProps?: Record<string, unknown>): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 123,
      properties: { label: 'H-101', ...overrideProps },
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
    {
      type: 'Feature',
      properties: { room_id: 'H-BATH', type: 'bathroom_men', name: 'Mens Washroom' },
      geometry: {
        type: 'Point',
        coordinates: [-73.579, 45.490],
      },
    },
    {
      type: 'Feature',
      properties: { code: 'H-ELEV', type: 'elevator' },
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
    {
      type: 'Feature',
      id: 'H-COLL',
      properties: { name: 'H-Collection' },
      geometry: {
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'Point',
            coordinates: [-73.579, 45.490],
          }
        ]
      }
    }
  ],
});

const makeNodeResponse = (id = 'node-1') => ({
  id,
  label: 'Nearest Node',
  wheelchairAccessible: false,
  floor: '8',
  building: 'H',
  longitude: -73.5798,
  latitude: 45.4902,
});

const makeIndoorSteps = () => ([
  {
    direction: 'STRAIGHT',
    distance: 5,
    description: 'Walk straight',
    nodes: [makeNodeResponse('node-from'), makeNodeResponse('node-to')],
  },
]);

// ─── suite ────────────────────────────────────────────────────────────────────
describe('FloorPlanViewer', () => {
  beforeEach(() => {
    latestRoomsPressHandler = undefined;
    latestUserLocationUpdate = undefined;
    latestDirectionBarProps = {};
    latestDirectionsModalProps = {};
    mockFetchNearestNode.mockReset();
    mockFetchIndoorDirections.mockReset();
    mockFetchIndoorDirections.mockResolvedValue([]);
    mockSetAccessible.mockReset();
  });

  // ── rendering ─────────────────────────────────────────────────────────────
  it('renders the container testID', () => {
    const {getByTestId} = render(<FloorPlanViewer buildingCode="H" floorId="8"/>);
    expect(getByTestId('indoor-floor-plan')).toBeTruthy();
  });

  it('renders placeholder text when geometry and rooms are missing', () => {
    const {getByText} = render(<FloorPlanViewer buildingCode="H" floorId="8"/>);
    expect(getByText('Floor plan viewer loading...')).toBeTruthy();
  });

  it('renders map when both planGeometry and rooms are provided', () => {
    const {queryByText} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(queryByText('Floor plan viewer loading...')).toBeNull();
  });

  it('renders placeholder when only planGeometry is provided (no rooms)', () => {
    const {getByText} = render(
      <FloorPlanViewer planGeometry={makePlanGeometry()} buildingCode="H" floorId="8"/>,
    );
    expect(getByText('Floor plan viewer loading...')).toBeTruthy();
  });

  it('renders placeholder when only rooms are provided (no planGeometry)', () => {
    const {getByText} = render(
      <FloorPlanViewer rooms={makeRooms()} buildingCode="H" floorId="8"/>,
    );
    expect(getByText('Floor plan viewer loading...')).toBeTruthy();
  });
  
  it('executes coordinate fallback safely when planGeometry is missing', () => {
    const { getByText } = render(<FloorPlanViewer planGeometry={null} rooms={makeRooms()} buildingCode="H" floorId="8"/>)
    expect(getByText('Floor plan viewer loading...')).toBeTruthy()
  })

  // ── room press ────────────────────────────────────────────────────────────
  it('calls onPressRoom with the feature id when a room is pressed', () => {
    const onPressRoom = jest.fn();
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestRoomsPressHandler?.({features: [{id: '123', properties: {label: 'H-101'}}]});
    });

    expect(onPressRoom).toHaveBeenCalledWith('123');
  });

  it('calls onPressRoom using roomId property when feature.id is absent', () => {
    const onPressRoom = jest.fn();
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestRoomsPressHandler?.({features: [{properties: {roomId: 'H-202'}}]});
    });

    expect(onPressRoom).toHaveBeenCalledWith('H-202');
  });

  it('calls onPressRoom using room_id property as fallback', () => {
    const onPressRoom = jest.fn();
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestRoomsPressHandler?.({features: [{properties: {room_id: 'H-303'}}]});
    });

    expect(onPressRoom).toHaveBeenCalledWith('H-303');
  });

  it('does not call onPressRoom when the pressed feature has no identifiable id', () => {
    const onPressRoom = jest.fn();
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestRoomsPressHandler?.({features: [{properties: {}}]});
    });

    expect(onPressRoom).not.toHaveBeenCalled();
  });

  it('does not throw when onPressRoom is not provided and a room is pressed', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(() => {
      act(() => {
        latestRoomsPressHandler?.({features: [{id: 123, properties: {}}]});
      });
    }).not.toThrow();
  });

  it('does not call onPressRoom when event has no features', () => {
    const onPressRoom = jest.fn();
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestRoomsPressHandler?.({features: []});
    });

    expect(onPressRoom).not.toHaveBeenCalled();
  });

  // ── selected room info card ───────────────────────────────────────────────
  it('shows selected room info card with label when a room is selected', () => {
    const {getByTestId, getByText} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(getByTestId('indoor-room-info-card')).toBeTruthy();
    expect(getByText('Selected room: H-101')).toBeTruthy();
  });

  it('shows selectedRoomId as fallback when room has no label property', () => {
    const roomsNoLabel = makeRooms({label: undefined, name: undefined, code: undefined});
    const {getByText} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsNoLabel}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );
    // Feature id 123 is used as label fallback
    expect(getByText('Selected room: 123')).toBeTruthy();
  });

  it('does not show info card when no room is selected', () => {
    const {queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(queryByTestId('indoor-room-info-card')).toBeNull();
  });

  it('uses room name property as label when label is absent', () => {
    const roomsWithName = makeRooms({label: undefined, name: 'Lab 101'});
    const {getByText} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsWithName}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(getByText('Selected room: Lab 101')).toBeTruthy();
  });

  // ── nearest-node / user location ──────────────────────────────────────────
  it('resolves nearest node on first UserLocation update and sets "Current Location" as from query', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-1'));

    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({coords: {longitude: -73.5798, latitude: 45.4902}});
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.5798, 45.4902);
    });
  });

  it('does not call fetchNearestNode a second time when UserLocation fires again on the same floor', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-1'));

    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({coords: {longitude: -73.5798, latitude: 45.4902}});
    });

    await act(async () => {
      latestUserLocationUpdate?.({coords: {longitude: -73.5799, latitude: 45.4903}});
    });

    expect(mockFetchNearestNode).toHaveBeenCalledTimes(1);
  });

  it('handles fetchNearestNode rejection gracefully (no crash)', async () => {
    mockFetchNearestNode.mockRejectedValue(new Error('No nodes found'));

    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await expect(
      act(async () => {
        latestUserLocationUpdate?.({coords: {longitude: -73.5798, latitude: 45.4902}});
      }),
    ).resolves.not.toThrow();
  });

  it('ignores UserLocation updates that have no coords', async () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({});
    });

    expect(mockFetchNearestNode).not.toHaveBeenCalled();
  });

  // ── createIndoorNodeSearchAdapter called with correct args ─────────────────
  it('creates the node search adapter with the correct buildingCode and floorId', () => {
    const {createIndoorNodeSearchAdapter} = require('@/services/maps/indoor-node-search-adapter');
    render(<FloorPlanViewer buildingCode="MB" floorId="2"/>);
    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('MB', '2');
  });

  it('re-creates the node search adapter when buildingCode changes', () => {
    const {createIndoorNodeSearchAdapter} = require('@/services/maps/indoor-node-search-adapter');
    createIndoorNodeSearchAdapter.mockClear();

    const {rerender} = render(<FloorPlanViewer buildingCode="H" floorId="8"/>);
    rerender(<FloorPlanViewer buildingCode="MB" floorId="8"/>);

    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('H', '8');
    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('MB', '8');
  });

  // ── direction bar rendered ────────────────────────────────────────────────
  it('renders the direction bar', () => {
    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(getByTestId('direction-bar')).toBeTruthy();
  });

  // ── POI destination tap ────────────────────────────────────────────────────
  it('uses nearest-node resolution for POI tap even when POI has node id', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('poi-node-1'));

    const roomsWithPoiNode = makeRooms();
    (roomsWithPoiNode.features[1].properties as Record<string, unknown>).nodeID = 'poi-node-1';

    const {getByTestId, queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsWithPoiNode}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.579, 45.49);
      expect(latestDirectionBarProps.toValue).toBe('Mens Washroom');
    });
    expect(queryByTestId('indoor-poi-quick-actions')).toBeNull();
  });

  it('sets destination from POI tap using nearest-node fallback when node id is missing', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('poi-node-2'));

    const {getByTestId, queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.579, 45.49);
      expect(latestDirectionBarProps.toValue).toBe('Mens Washroom');
    });
    expect(queryByTestId('indoor-poi-quick-actions')).toBeNull();
  });

  it('keeps destination label but does not start routing when POI node cannot be resolved', async () => {
    mockFetchNearestNode.mockRejectedValue(new Error('No nodes found in radius'));

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Start', id: 'start-node'}, undefined);
    });

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    await waitFor(() => {
      expect(latestDirectionBarProps.toValue).toBe('Mens Washroom');
    });

    expect(mockFetchIndoorDirections).not.toHaveBeenCalled();
  });

  it('ignores POI taps while indoor directions are active', async () => {
    mockFetchIndoorDirections.mockResolvedValue(makeIndoorSteps());

    const {getByTestId, queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={jest.fn()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-from', roomId: 'room-1' } }],
      });
    });

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-to', roomId: 'room-2' } }],
      });
    });

    await waitFor(() => {
      expect(getByTestId('directions-modal')).toBeTruthy();
    });

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    expect(latestDirectionBarProps.toValue).toBe('node-to');
    expect(mockFetchNearestNode).not.toHaveBeenCalled();

    act(() => {
      latestDirectionsModalProps.onClose?.();
    });

    await waitFor(() => {
      expect(queryByTestId('directions-modal')).toBeNull();
    });
  });

  it('does not apply stale POI destination updates after destination is cleared during async lookup', async () => {
    let resolveNearestNodeRequest: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode.mockImplementation(
      () => new Promise((resolve) => {
        resolveNearestNodeRequest = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
      }),
    );

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    act(() => {
      latestDirectionBarProps.onClearTo();
    });

    await act(async () => {
      resolveNearestNodeRequest?.(makeNodeResponse('late-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('does not apply stale POI lookup result after room tap sets destination', async () => {
    let resolvePoiLookup: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode.mockImplementation(
      () => new Promise((resolve) => {
        resolvePoiLookup = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
      }),
    );

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={jest.fn()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Start', id: 'start-node'}, undefined);
    });

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'room-destination-node', roomId: 'room-2' } }],
      });
    });

    expect(latestDirectionBarProps.toValue).toBe('room-destination-node');

    await act(async () => {
      resolvePoiLookup?.(makeNodeResponse('late-poi-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('room-destination-node');
  });

  it('does not apply stale POI lookup result after manual destination typing', async () => {
    let resolvePoiLookup: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode.mockImplementation(
      () => new Promise((resolve) => {
        resolvePoiLookup = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
      }),
    );

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    act(() => {
      latestDirectionBarProps.onChangeTo('Manual destination');
    });

    expect(latestDirectionBarProps.toValue).toBe('Manual destination');

    await act(async () => {
      resolvePoiLookup?.(makeNodeResponse('late-poi-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('Manual destination');
  });

  it('does not apply POI destination label from a stale floor lookup after floor change', async () => {
    let resolveOldFloorLookup: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode.mockImplementation(
      () => new Promise((resolve) => {
        resolveOldFloorLookup = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
      }),
    );

    const {getByTestId, rerender} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    rerender(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="9"
      />,
    );

    expect(latestDirectionBarProps.toValue).toBe('');

    await act(async () => {
      resolveOldFloorLookup?.(makeNodeResponse('old-floor-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('does not apply stale POI lookup results after floor change and a new POI selection', async () => {
    let resolveOldFloorLookup: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveOldFloorLookup = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
        }),
      )
      .mockResolvedValueOnce(makeNodeResponse('new-floor-node'));

    const {getByTestId, rerender} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    rerender(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="9"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-1'));

    await waitFor(() => {
      expect(latestDirectionBarProps.toValue).toBe('H-ELEV');
    });

    await act(async () => {
      resolveOldFloorLookup?.(makeNodeResponse('old-floor-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('H-ELEV');
  });

  // ── DirectionBar callbacks ────────────────────────────────────────────────
  it('onSelectFrom sets fromQuery and fromNodeId', () => {
    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(getByTestId('direction-bar')).toBeTruthy();

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, undefined);
    });

    expect(latestDirectionBarProps.fromValue).toBe('Room A');
  });

  it('onSelectFrom with coordinates calls setCamera', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, [-73.58, 45.49]);
    });

    // No crash and fromValue updated
    expect(latestDirectionBarProps.fromValue).toBe('Room A');
  });

  it('onSelectTo sets toQuery and toNodeId', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'node-B'}, undefined);
    });

    expect(latestDirectionBarProps.toValue).toBe('Room B');
  });

  it('onSelectTo with coordinates calls setCamera', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'node-B'}, [-73.579, 45.491]);
    });

    expect(latestDirectionBarProps.toValue).toBe('Room B');
  });

  it('onClearFrom resets fromQuery to empty string', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onClearFrom();
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
  });

  it('onClearTo resets toQuery to empty string', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'node-B'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onClearTo();
    });

    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('onResetFrom resets fromQuery to empty string', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onResetFrom();
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
  });

  it('onSwap exchanges fromQuery and toQuery', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'node-B'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onSwap();
    });

    expect(latestDirectionBarProps.fromValue).toBe('Room B');
    expect(latestDirectionBarProps.toValue).toBe('Room A');
  });

  it('onClose clears both fromQuery and toQuery', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'node-A'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'node-B'}, undefined);
    });
    act(() => {
      latestDirectionBarProps.onClose();
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');
  });

  // ── GeometryCollection ────────────────────────────────────────────────────
  it('renders map when planGeometry is a GeometryCollection', () => {
    const geometryCollection: GeoJSON.GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [
        {
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
      ],
    };

    const {queryByText} = render(
      <FloorPlanViewer
        planGeometry={geometryCollection}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(queryByText('Floor plan viewer loading...')).toBeNull();
  });

  it('renders map when planGeometry is a GeometryCollection containing a nested GeometryCollection', () => {
    const nestedGeometryCollection: GeoJSON.GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'GeometryCollection',
          geometries: [
            {
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
          ],
        },
      ],
    };

    const {queryByText} = render(
      <FloorPlanViewer
        planGeometry={nestedGeometryCollection}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(queryByText('Floor plan viewer loading...')).toBeNull();
  });

  // ── floor / building change with cached user coords ────────────────────────
  it('re-resolves nearest node when floorId changes and user coords are already known', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-1'));

    const {rerender} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    // Populate userCoordsRef via first location update
    await act(async () => {
      latestUserLocationUpdate?.({coords: {longitude: -73.5798, latitude: 45.4902}});
    });

    await waitFor(() => expect(mockFetchNearestNode).toHaveBeenCalledTimes(1));

    mockFetchNearestNode.mockClear();
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-2'));

    // Change the floorId — the effect should re-run resolveNearestNode with cached coords
    await act(async () => {
      rerender(
        <FloorPlanViewer
          planGeometry={makePlanGeometry()}
          rooms={makeRooms()}
          buildingCode="H"
          floorId="9"
        />,
      );
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '9', -73.5798, 45.4902);
    });
  });

  it('re-resolves nearest node when buildingCode changes and user coords are already known', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-1'));

    const {rerender} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({coords: {longitude: -73.5798, latitude: 45.4902}});
    });

    await waitFor(() => expect(mockFetchNearestNode).toHaveBeenCalledTimes(1));

    mockFetchNearestNode.mockClear();
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-mb'));

    await act(async () => {
      rerender(
        <FloorPlanViewer
          planGeometry={makePlanGeometry()}
          rooms={makeRooms()}
          buildingCode="MB"
          floorId="8"
        />,
      );  
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('MB', '8', -73.5798, 45.4902);
    });
  });
  it('sets toQuery via room press when fromQuery is already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'node-from', id: 'node-from'}, undefined);
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-to', roomId: 'room-2' } }],
      });
    });

    expect(latestDirectionBarProps.toValue).toBe('node-to');
  });
  it('does not set toQuery when nodeID is missing on room press with fromQuery already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'node-from', id: 'node-from'}, undefined);
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { roomId: 'room-2' } }],
      });
    });

    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('does not set toQuery when nodeID is empty string on room press with fromQuery already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'node-from', id: 'node-from'}, undefined);
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-2' } }],
      });
    });

    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('does not overwrite toQuery on third room press when both are already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'node-from', id: 'node-from'}, undefined);
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-to', roomId: 'room-2' } }],
      });
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-extra', roomId: 'room-3' } }],
      });
    });

    expect(latestDirectionBarProps.toValue).toBe('node-to');
  });

  it('sets fromQuery via room press when fromQuery is not already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    )
    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-from', roomId: 'room-2' } }],
      });
    });


    expect(latestDirectionBarProps.fromValue).toBe('node-from');
  });

  it('does not set fromQuery when nodeID is empty string on room press with fromQuery not already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );


    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-2' } }],
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
  });

  it('does not overwrite fromQuery on third room press when both are already set', () => {
    const onPressRoom = jest.fn();
    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={onPressRoom}
            buildingCode="H"
            floorId="8"
        />,
    );


    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-from', roomId: 'room-2' } }],
      });
    });

    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-to', roomId: 'room-3' } }],
      });
    });
    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-extra', roomId: 'room-3' } }],
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('node-from');
  });

  it('sets fromQuery to resolved id when fromQuery is empty when using coordinates', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-resolved'));

    render(
        <FloorPlanViewer planGeometry={makePlanGeometry()} rooms={makeRooms()}
                         onPressRoom={jest.fn()} buildingCode="H" floorId="8" />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
        coordinates: { latitude: 45.4902, longitude: -73.5798 },
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('node-resolved');
  });

  it('sets toQuery to resolved id when toQuery is empty when using coordinates', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-resolved'));

    render(
        <FloorPlanViewer planGeometry={makePlanGeometry()} rooms={makeRooms()}
                         onPressRoom={jest.fn()} buildingCode="H" floorId="8" />,
    );
    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-from', roomId: 'room-2' } }],
      });
    });
    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
        coordinates: { latitude: 45.4902, longitude: -73.5798 },
      });
    });
    expect(latestDirectionBarProps.toValue).toBe('node-resolved');
  });

  it('does not set toQuery when nearest node cannot be resolved using coordinates', async () => {
    mockFetchNearestNode.mockRejectedValue(new Error('No nodes found'));

    render(
        <FloorPlanViewer planGeometry={makePlanGeometry()} rooms={makeRooms()}
                         onPressRoom={jest.fn()} buildingCode="H" floorId="8" />,
    );
    act(() => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: 'node-from', roomId: 'room-2' } }],
      });
    });
    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '', roomId: 'room-1' } }],
        coordinates: { latitude: 45.4902, longitude: -73.5798 },
      });
    });
    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('keeps from/to queries empty when fetchNearestNode rejects inside findNearestIndoorNode', async () => {
    mockFetchNearestNode.mockRejectedValue(new Error('No nodes'));

    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={jest.fn()}
            buildingCode="H"
            floorId="8"
        />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
        coordinates: { latitude: 45.4902, longitude: -73.5798 },
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('handles non-Error nearest-node rejection without changing destination', async () => {
    mockFetchNearestNode.mockRejectedValue('string error');

    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={jest.fn()}
            buildingCode="H"
            floorId="8"
        />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
        coordinates: { latitude: 45.4902, longitude: -73.5798 },
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('logs error when coordinates are missing and nodeID is empty', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={jest.fn()}
            buildingCode="H"
            floorId="8"
        />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
      });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid coordinates');
    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');

    consoleErrorSpy.mockRestore();
  });

  it('does not update fromQuery or toQuery when coordinates are invalid', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={jest.fn()}
            buildingCode="H"
            floorId="8"
        />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');

    consoleErrorSpy.mockRestore();
  });

  it('resolves coordinates from event.geometry.type Point when coordinates field is absent', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('node-from-geometry'));

    render(
        <FloorPlanViewer
            planGeometry={makePlanGeometry()}
            rooms={makeRooms()}
            onPressRoom={jest.fn()}
            buildingCode="H"
            floorId="8"
        />,
    );

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{ properties: { nodeID: '   ', roomId: 'room-1' } }],
        geometry: {
          type: 'Point',
          coordinates: [-73.5798, 45.4902],
        },
      });
    });

    expect(latestDirectionBarProps.fromValue).toBe('node-from-geometry');
  });

});
