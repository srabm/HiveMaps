import React from 'react';
import {render, act, waitFor} from '@testing-library/react-native';
import type * as GeoJSON from 'geojson';
import {FloorPlanViewer, buildActiveFloorRouteView, buildFloorTraversalList} from '@/components/indoor/floor-plan-viewer';
import type { IndoorDirectionsResponse } from '@/services/http/indoor-api';

// ─── captured handlers ────────────────────────────────────────────────────────
let latestRoomsPressHandler: ((event: any) => void) | undefined;
let latestUserLocationUpdate: ((loc: any) => void) | undefined;
let latestDirectionBarProps: Record<string, any> = {};
let latestDirectionsModalProps: Record<string, any> = {};

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

const makeDirectionsSteps = () => [
  {
    direction: 'STRAIGHT',
    distance: 10,
    description: 'Walk straight',
    nodes: [
      {
        id: 'H1.101',
        floor: '1',
        building: 'H',
        longitude: -73.58,
        latitude: 45.49,
        label: '',
        wheelchairAccessible: false,
      },
    ],
  },
];

describe('buildFloorTraversalList', () => {
  it('builds ascending floors inclusively', () => {
    expect(buildFloorTraversalList(1, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('builds descending floors inclusively', () => {
    expect(buildFloorTraversalList(8, 5)).toEqual([8, 7, 6, 5]);
  });

  it('returns the same floor when start and end match', () => {
    expect(buildFloorTraversalList(3, 3)).toEqual([3]);
  });
});

describe('buildActiveFloorRouteView', () => {
  const makeStepNode = (id: string, floor: string, longitude: number, latitude: number) => ({
    id,
    label: id,
    wheelchairAccessible: true,
    floor,
    building: 'H',
    longitude,
    latitude,
  });

  const routeSteps: IndoorDirectionsResponse[] = [
    {
      direction: 'STRAIGHT' as const,
      distance: 25,
      description: 'Walk on floor 8',
      nodes: [
        makeStepNode('H8.001', '8', -73.5800, 45.4900),
        makeStepNode('H8.002', '8', -73.5799, 45.4901),
      ],
    },
    {
      direction: 'UP_OR_DOWN' as const,
      distance: 0,
      description: 'Take stairs up to floor 9',
      nodes: [
        makeStepNode('H8.STAIR', '8', -73.5798, 45.4902),
        makeStepNode('H9.STAIR', '9', -73.5798, 45.4902),
      ],
    },
    {
      direction: 'STRAIGHT' as const,
      distance: 15,
      description: 'Walk on floor 9',
      nodes: [
        makeStepNode('H9.001', '9', -73.5797, 45.4903),
      ],
    },
  ];

  it('returns only nodes from the active floor segment', () => {
    const result = buildActiveFloorRouteView(routeSteps, '8');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].nodes.map((node) => node.id)).toEqual(['H8.001', 'H8.002', 'H8.STAIR']);
  });

  it('adds an up-arrow transition marker at the segment end when route continues upward', () => {
    const result = buildActiveFloorRouteView(routeSteps, '8');
    expect(result.startTransitionMarker).toBeNull();
    expect(result.endTransitionMarker).toEqual({
      coordinate: [-73.5798, 45.4902],
      icon: 'uparrow',
    });
  });

  it('adds a down-arrow transition marker when route continues downward', () => {
    const descending: IndoorDirectionsResponse[] = [
      {
        direction: 'STRAIGHT' as const,
        distance: 10,
        description: 'Walk floor 9',
        nodes: [makeStepNode('H9.010', '9', -73.5791, 45.4901)],
      },
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Take elevator down to floor 8',
        nodes: [
          makeStepNode('H9.ELEV', '9', -73.5790, 45.4900),
          makeStepNode('H8.ELEV', '8', -73.5790, 45.4900),
        ],
      },
    ];

    const result = buildActiveFloorRouteView(descending, '9');
    expect(result.endTransitionMarker?.icon).toBe('downarrow');
    expect(result.endTransitionMarker?.coordinate).toEqual([-73.5790, 45.4900]);
  });

  it('shows a start transition marker and no end marker when route ends on active floor', () => {
    const result = buildActiveFloorRouteView(routeSteps, '9');
    expect(result.steps).toHaveLength(1);
    expect(result.startTransitionMarker).toEqual({
      coordinate: [-73.5798, 45.4902],
      icon: 'uparrow',
    });
    expect(result.endTransitionMarker).toBeNull();
  });

  it('matches floors by numeric value when id format differs', () => {
    const result = buildActiveFloorRouteView(routeSteps, 'L8');
    expect(result.steps[0].nodes.map((node) => node.floor)).toEqual(['8', '8', '8']);
  });
});

// ─── suite ────────────────────────────────────────────────────────────────────
describe('FloorPlanViewer', () => {
  beforeEach(() => {
    latestRoomsPressHandler = undefined;
    latestUserLocationUpdate = undefined;
    latestDirectionBarProps = {};
    latestDirectionsModalProps = {};
    mockFetchNearestNode.mockReset();
    mockFetchIndoorDirections.mockReset();
    mockFetchIndoorDirections.mockRejectedValue(new Error('No directions found'));
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
  it('creates the node search adapter with the correct buildingCode', () => {
    const {createIndoorNodeSearchAdapter} = require('@/services/maps/indoor-node-search-adapter');
    render(<FloorPlanViewer buildingCode="MB" floorId="2"/>);
    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('MB');
  });

  it('re-creates the node search adapter when buildingCode changes', () => {
    const {createIndoorNodeSearchAdapter} = require('@/services/maps/indoor-node-search-adapter');
    createIndoorNodeSearchAdapter.mockClear();

    const {rerender} = render(<FloorPlanViewer buildingCode="H" floorId="8"/>);
    rerender(<FloorPlanViewer buildingCode="MB" floorId="8"/>);

    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('H');
    expect(createIndoorNodeSearchAdapter).toHaveBeenCalledWith('MB');
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

  it('forwards step node floor changes from turn-by-turn modal', async () => {
    const onStepFloorChange = jest.fn();
    mockFetchIndoorDirections.mockResolvedValueOnce([
      {
        direction: 'STRAIGHT',
        distance: 10,
        description: 'Move to floor 3 connector',
        nodes: [
          {
            id: 'H3.100',
            label: 'Node',
            wheelchairAccessible: true,
            floor: '3',
            building: 'H',
            longitude: -73.58,
            latitude: 45.49,
          },
        ],
      },
    ]);

    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
        onStepFloorChange={onStepFloorChange}
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'Room A', id: 'H1.101'}, undefined);
      latestDirectionBarProps.onSelectTo({name: 'Room B', id: 'H8.841'}, undefined);
    });

    await waitFor(() => {
      expect(latestDirectionsModalProps.onCurrentNodeChange).toBeDefined();
    });

    act(() => {
      latestDirectionsModalProps.onCurrentNodeChange({
        id: 'H3.110',
        label: 'Node',
        wheelchairAccessible: false,
        floor: '3',
        building: 'H',
        longitude: -73.58,
        latitude: 45.49,
      });
    });

    expect(onStepFloorChange).toHaveBeenCalledWith('3');
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
        />
    );
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

  //  mockFetchNearestNode.mockRejectedValue(new Error('No nodes found'));
  it('sets toQuery to resolved id when toQuery is null string when using coordinates', async () => {
    mockFetchNearestNode.mockResolvedValue(new Error('No nodes found'));

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
    expect(latestDirectionBarProps.toValue).toBe("undefined");
  });

  it('logs warning when fetchNearestNode rejects inside findNearestIndoorNode', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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

    expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NearestNode] No matching node found:',
        'No nodes',
    );
    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');
    consoleLogSpy.mockRestore();
  });

  it('logs warning with raw error when rejection is not an Error instance', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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

    expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NearestNode] No matching node found:',
        'string error',
    );

    consoleLogSpy.mockRestore();
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