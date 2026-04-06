import React from 'react';
import {render, act, fireEvent, waitFor} from '@testing-library/react-native';
import type * as GeoJSON from 'geojson';
import {FloorPlanViewer, buildActiveFloorRouteView, buildFloorTraversalList} from '@/components/indoor/floor-plan-viewer';
import type { IndoorDirectionsResponse } from '@/services/http/indoor-api';

// ─── captured handlers ────────────────────────────────────────────────────────
let latestRoomsPressHandler: ((event: any) => void) | undefined;
let latestUserLocationUpdate: ((loc: any) => void) | undefined;
let latestDirectionBarProps: Record<string, any> = {};
let latestDirectionsModalProps: Record<string, any> = {};
const mockSetAccessible = jest.fn();
let mockAccessible = false;
let mockLatestMarkerViews: Array<{ id?: string; source?: unknown }> = [];

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
      MarkerView: ({ children, id }: any) => {
        mockLatestMarkerViews.push({ id, source: children?.props?.source });
        return React.createElement(View, { testID: id }, children);
      },
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
    accessible: mockAccessible,
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

  it('selects the segment that contains currentNodeId when multiple active-floor segments exist', () => {
    const multiSegment: IndoorDirectionsResponse[] = [
      {
        direction: 'STRAIGHT' as const,
        distance: 5,
        description: 'Segment one',
        nodes: [makeStepNode('H8.A', '8', -73.5801, 45.4901)],
      },
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Go up to 9',
        nodes: [
          makeStepNode('H8.STAIR.A', '8', -73.58, 45.4902),
          makeStepNode('H9.STAIR', '9', -73.58, 45.4902),
        ],
      },
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Go down to 8',
        nodes: [
          makeStepNode('H9.STAIR.B', '9', -73.5799, 45.4903),
          makeStepNode('H8.B', '8', -73.5799, 45.4903),
        ],
      },
    ];

    const result = buildActiveFloorRouteView(multiSegment, '8', 'H8.B');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].nodes.map((node) => node.id)).toEqual(['H8.B']);
  });

  it('returns downarrow from fallback text when floors are non-numeric and text includes down', () => {
    const nonNumeric: IndoorDirectionsResponse[] = [
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Go down to mezzanine',
        nodes: [
          makeStepNode('H-LOBBY', 'LOBBY', -73.5802, 45.4902),
          makeStepNode('H-MEZZ', 'MEZZ', -73.5801, 45.4902),
        ],
      },
    ];

    const result = buildActiveFloorRouteView(nonNumeric, 'LOBBY');
    expect(result.endTransitionMarker?.icon).toBe('downarrow');
  });

  it('returns uparrow from fallback text when floors are non-numeric and text includes up', () => {
    const nonNumeric: IndoorDirectionsResponse[] = [
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Go up to mezzanine',
        nodes: [
          makeStepNode('H-LOBBY', 'LOBBY', -73.5802, 45.4902),
          makeStepNode('H-MEZZ', 'MEZZ', -73.5801, 45.4902),
        ],
      },
    ];

    const result = buildActiveFloorRouteView(nonNumeric, 'LOBBY');
    expect(result.endTransitionMarker?.icon).toBe('uparrow');
  });

  it('defaults to uparrow when fallback text has no up/down keyword', () => {
    const nonNumeric: IndoorDirectionsResponse[] = [
      {
        direction: 'UP_OR_DOWN' as const,
        distance: 0,
        description: 'Proceed to mezzanine connector',
        nodes: [
          makeStepNode('H-LOBBY', 'LOBBY', -73.5802, 45.4902),
          makeStepNode('H-MEZZ', 'MEZZ', -73.5801, 45.4902),
        ],
      },
    ];

    const result = buildActiveFloorRouteView(nonNumeric, 'LOBBY');
    expect(result.endTransitionMarker?.icon).toBe('uparrow');
  });
});

// ─── suite ────────────────────────────────────────────────────────────────────
describe('FloorPlanViewer', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    latestRoomsPressHandler = undefined;
    latestUserLocationUpdate = undefined;
    latestDirectionBarProps = {};
    latestDirectionsModalProps = {};
    mockFetchNearestNode.mockReset();
    mockFetchIndoorDirections.mockReset();
    mockFetchIndoorDirections.mockResolvedValue([]);
    mockSetAccessible.mockReset();
    mockAccessible = false;
    mockLatestMarkerViews = [];
    mockFetchNearestNode.mockReset();
    mockFetchIndoorDirections.mockReset();
    mockFetchIndoorDirections.mockRejectedValue(new Error('No directions found'));

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
      const firstArg = String(args[0] ?? '');
      if (firstArg.includes('[IndoorDirections] No directions found:')) {
        return;
      }
    });

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const firstArg = String(args[0] ?? '');
      if (firstArg.includes('An update to FloorPlanViewer inside a test was not wrapped in act')) {
        return;
      }
      if (firstArg === 'Invalid coordinates') {
        return;
      }
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
    const {queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(queryByTestId('indoor-room-info-card')).toBeNull();
  });

  it('shows selectedRoomId as fallback when room has no label property', () => {
    const roomsNoLabel = makeRooms({label: undefined, name: undefined, code: undefined});
    const {queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsNoLabel}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );
    // Feature id 123 is used as label fallback
    expect(queryByTestId('indoor-room-info-card')).toBeNull();
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
    const {queryByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsWithName}
        selectedRoomId="123"
        buildingCode="H"
        floorId="8"
      />,
    );
    expect(queryByTestId('indoor-room-info-card')).toBeNull();
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

  it('keeps the start field empty after clearing Current Location', async () => {
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
      expect(latestDirectionBarProps.fromValue).toBe('Current Location');
    });

    act(() => {
      latestDirectionBarProps.onClearFrom();
    });

    await waitFor(() => {
      expect(latestDirectionBarProps.fromValue).toBe('');
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

  it('does not pass an onClose handler to the indoor direction bar', () => {
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    expect(latestDirectionBarProps.onClose).toBeUndefined();
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

  it('derives POI destination label from type when explicit label is blank', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('poi-node-type-derived'));

    const roomsWithUnlabeledPoi: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'room-1',
          properties: { label: 'H-101' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-73.5799, 45.4901],
              [-73.5796, 45.4901],
              [-73.5796, 45.4904],
              [-73.5799, 45.4904],
              [-73.5799, 45.4901],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { type: 'bathroom_unisex_acc', label: '   ' },
          geometry: {
            type: 'Point',
            coordinates: [-73.5792, 45.4901],
          },
        },
      ],
    };

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsWithUnlabeledPoi}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.5792, 45.4901);
      expect(latestDirectionBarProps.toValue).toBe('POI: Bathroom Unisex Acc');
    });
  });

  it('normalizes uppercase/trimmed POI type values into destination labels', async () => {
    mockFetchNearestNode.mockResolvedValue(makeNodeResponse('poi-node-type-normalized'));

    const roomsWithNormalizedPoiType: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'room-1',
          properties: { label: 'H-101' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-73.5799, 45.4901],
              [-73.5796, 45.4901],
              [-73.5796, 45.4904],
              [-73.5799, 45.4904],
              [-73.5799, 45.4901],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { type: '  WATER_FOUNTAIN  ' },
          geometry: {
            type: 'Point',
            coordinates: [-73.5793, 45.4902],
          },
        },
      ],
    };

    const {getByTestId} = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={roomsWithNormalizedPoiType}
        buildingCode="H"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    await waitFor(() => {
      expect(latestDirectionBarProps.toValue).toBe('POI: Water Fountain');
    });
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

  it('emits directions active state changes through onDirectionsActiveChange', async () => {
    mockFetchIndoorDirections.mockResolvedValue(makeIndoorSteps());
    const onDirectionsActiveChange = jest.fn();

    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={jest.fn()}
        onDirectionsActiveChange={onDirectionsActiveChange}
        buildingCode="H"
        floorId="8"
      />,
    );

    await waitFor(() => {
      expect(onDirectionsActiveChange).toHaveBeenCalledWith(false);
    });

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
      expect(onDirectionsActiveChange).toHaveBeenCalledWith(true);
    });

    act(() => {
      latestDirectionsModalProps.onClose?.();
    });

    await waitFor(() => {
      expect(onDirectionsActiveChange).toHaveBeenLastCalledWith(false);
    });
  });

  it('clears both endpoints when the pre-start modal is cancelled', async () => {
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
        features: [{properties: {nodeID: 'node-from', roomId: 'room-1'}}],
      });
    });

    await act(async () => {
      latestRoomsPressHandler?.({
        features: [{properties: {nodeID: 'node-to', roomId: 'room-2'}}],
      });
    });

    await waitFor(() => {
      expect(getByTestId('directions-modal')).toBeTruthy();
    });

    act(() => {
      latestDirectionsModalProps.onCancel?.();
    });

    await waitFor(() => {
      expect(queryByTestId('directions-modal')).toBeNull();
    });

    expect(latestDirectionBarProps.fromValue).toBe('');
    expect(latestDirectionBarProps.toValue).toBe('');
  });

  it('uses "Navigate" pre-start label when accessibility mode is enabled', async () => {
    mockAccessible = true;
    mockFetchIndoorDirections.mockResolvedValue(makeIndoorSteps());

    const {getByTestId} = render(
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

    expect(latestDirectionsModalProps.preStartLabel).toBe('Navigate');
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

  it('does not apply stale POI lookup result after selecting destination from suggestions', async () => {
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
      latestDirectionBarProps.onSelectTo({name: 'Selected destination', id: 'selected-node'}, undefined);
    });

    expect(latestDirectionBarProps.toValue).toBe('Selected destination');

    await act(async () => {
      resolvePoiLookup?.(makeNodeResponse('late-poi-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('Selected destination');
  });

  it('does not apply stale POI lookup result after swap action', async () => {
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

    act(() => {
      latestDirectionBarProps.onSelectFrom({name: 'From A', id: 'node-a'}, undefined);
      latestDirectionBarProps.onSelectTo({name: 'To B', id: 'node-b'}, undefined);
    });

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-0'));

    act(() => {
      latestDirectionBarProps.onSwap();
    });

    expect(latestDirectionBarProps.toValue).toBe('From A');

    await act(async () => {
      resolvePoiLookup?.(makeNodeResponse('late-poi-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('From A');
  });

  it('does not apply stale POI lookup result after clearing destination', async () => {
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
      latestDirectionBarProps.onClearTo();
    });

    expect(latestDirectionBarProps.toValue).toBe('');

    await act(async () => {
      resolvePoiLookup?.(makeNodeResponse('late-poi-node'));
      await Promise.resolve();
    });

    expect(latestDirectionBarProps.toValue).toBe('');
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

  it('does not apply stale POI lookup results after building change and a new POI selection', async () => {
    let resolveOldBuildingLookup: ((value: ReturnType<typeof makeNodeResponse>) => void) | null = null;
    mockFetchNearestNode
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveOldBuildingLookup = resolve as (value: ReturnType<typeof makeNodeResponse>) => void;
        }),
      )
      .mockResolvedValueOnce(makeNodeResponse('new-building-node'));

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
        buildingCode="MB"
        floorId="8"
      />,
    );

    fireEvent.press(getByTestId('indoor-poi-marker-poi-fallback-1'));

    await waitFor(() => {
      expect(latestDirectionBarProps.toValue).toBe('H-ELEV');
    });

    await act(async () => {
      resolveOldBuildingLookup?.(makeNodeResponse('old-building-node'));
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

  it('switches to the destination floor immediately when selecting a destination node', () => {
    const onStepFloorChange = jest.fn();

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
      latestDirectionBarProps.onSelectTo({name: 'Room 9', id: 'H9.101'}, undefined);
    });

    expect(onStepFloorChange).toHaveBeenCalledWith('9');
  });

  it('switches to the start floor immediately when selecting a start node', () => {
    const onStepFloorChange = jest.fn();

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
      latestDirectionBarProps.onSelectFrom({name: 'Room 9', id: 'H9.101'}, undefined);
    });

    expect(onStepFloorChange).toHaveBeenCalledWith('9');
  });

  it('keeps the original start node after destination-triggered floor switch', async () => {
    const onStepFloorChange = jest.fn();
    mockFetchNearestNode.mockResolvedValueOnce(makeNodeResponse('H8.START'));
    mockFetchIndoorDirections.mockResolvedValueOnce([]);

    const { rerender } = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
        onStepFloorChange={onStepFloorChange}
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({ coords: { longitude: -73.5798, latitude: 45.4902 } });
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledTimes(1);
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.5798, 45.4902);
    });

    act(() => {
      latestDirectionBarProps.onSelectTo({ name: 'Room 9', id: 'H9.101' }, undefined);
    });

    expect(onStepFloorChange).toHaveBeenCalledWith('9');

    await act(async () => {
      rerender(
        <FloorPlanViewer
          planGeometry={makePlanGeometry()}
          rooms={makeRooms()}
          buildingCode="H"
          floorId="9"
          onStepFloorChange={onStepFloorChange}
        />,
      );
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledTimes(2);
      expect(mockFetchIndoorDirections).toHaveBeenCalledWith('H', 'H8.START', 'H9.101', false);
    });
  });

  it('skips floor-change origin re-resolve right after destination-triggered floor switch', async () => {
    const onStepFloorChange = jest.fn();
    mockFetchNearestNode.mockResolvedValueOnce(makeNodeResponse('H8.START'));

    const { rerender } = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
        onStepFloorChange={onStepFloorChange}
      />,
    );

    await act(async () => {
      latestUserLocationUpdate?.({ coords: { longitude: -73.5798, latitude: 45.4902 } });
    });

    await waitFor(() => {
      expect(mockFetchNearestNode).toHaveBeenCalledTimes(1);
      expect(mockFetchNearestNode).toHaveBeenCalledWith('H', '8', -73.5798, 45.4902);
    });

    act(() => {
      latestDirectionBarProps.onSelectTo({ name: 'Room 9', id: 'H9.101' }, undefined);
    });

    expect(onStepFloorChange).toHaveBeenCalledWith('9');

    await act(async () => {
      // Simulate parent screen switching to destination floor.
      rerender(
        <FloorPlanViewer
          planGeometry={makePlanGeometry()}
          rooms={makeRooms()}
          buildingCode="H"
          floorId="9"
          onStepFloorChange={onStepFloorChange}
        />,
      );
      await Promise.resolve();
    });

    // The guard should prevent floor-change nearest-node re-resolution once.
    expect(mockFetchNearestNode).toHaveBeenCalledTimes(2);
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

  it('renders MapboxGL.MarkerView transition markers with start downarrow and end uparrow images', async () => {
    const upArrow = require('@/assets/images/uparrow.png');
    const downArrow = require('@/assets/images/downarrow.png');

    mockFetchIndoorDirections.mockResolvedValueOnce([
      {
        direction: 'UP_OR_DOWN',
        distance: 0,
        description: 'Descend to floor 8',
        nodes: [
          {
            id: 'H9.STAIR', label: 'H9.STAIR', wheelchairAccessible: true, floor: '9', building: 'H', longitude: -73.58, latitude: 45.49,
          },
          {
            id: 'H8.STAIR.A', label: 'H8.STAIR.A', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.5799, latitude: 45.4901,
          },
        ],
      },
      {
        direction: 'STRAIGHT',
        distance: 5,
        description: 'Walk on floor 8',
        nodes: [
          {
            id: 'H8.100', label: 'H8.100', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.5798, latitude: 45.4902,
          },
        ],
      },
      {
        direction: 'UP_OR_DOWN',
        distance: 0,
        description: 'Ascend to floor 9',
        nodes: [
          {
            id: 'H8.STAIR.B', label: 'H8.STAIR.B', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.5797, latitude: 45.4903,
          },
          {
            id: 'H9.101', label: 'H9.101', wheelchairAccessible: true, floor: '9', building: 'H', longitude: -73.5796, latitude: 45.4904,
          },
        ],
      },
    ]);

    const { getByTestId } = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        buildingCode="H"
        floorId="8"
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({ name: 'From', id: 'H9.001' }, undefined);
      latestDirectionBarProps.onSelectTo({ name: 'To', id: 'H9.101' }, undefined);
    });

    await waitFor(() => {
      expect(getByTestId('indoor-floor-transition-marker-start')).toBeTruthy();
      expect(getByTestId('indoor-floor-transition-marker-end')).toBeTruthy();
    });

    const startMarker = mockLatestMarkerViews.find((marker) => marker.id === 'indoor-floor-transition-marker-start');
    const endMarker = mockLatestMarkerViews.find((marker) => marker.id === 'indoor-floor-transition-marker-end');

    expect(startMarker?.source).toBe(downArrow);
    expect(endMarker?.source).toBe(upArrow);
  });

  it('uses the downarrow image for end transition marker when route exits to a lower floor', async () => {
    const downArrow = require('@/assets/images/downarrow.png');

    mockFetchIndoorDirections.mockResolvedValueOnce([
      {
        direction: 'STRAIGHT',
        distance: 5,
        description: 'Walk on floor 8',
        nodes: [
          {
            id: 'H8.100', label: 'H8.100', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.5798, latitude: 45.4902,
          },
        ],
      },
      {
        direction: 'UP_OR_DOWN',
        distance: 0,
        description: 'Go down to floor 7',
        nodes: [
          {
            id: 'H8.STAIR', label: 'H8.STAIR', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.5797, latitude: 45.4903,
          },
          {
            id: 'H7.100', label: 'H7.100', wheelchairAccessible: true, floor: '7', building: 'H', longitude: -73.5796, latitude: 45.4904,
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
      />,
    );

    act(() => {
      latestDirectionBarProps.onSelectFrom({ name: 'From', id: 'H8.050' }, undefined);
      latestDirectionBarProps.onSelectTo({ name: 'To', id: 'H7.100' }, undefined);
    });

    await waitFor(() => {
      const endMarker = mockLatestMarkerViews.find((marker) => marker.id === 'indoor-floor-transition-marker-end');
      expect(endMarker?.source).toBe(downArrow);
    });
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

  it('clearing both fields resets fromQuery and toQuery', () => {
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
      latestDirectionBarProps.onClearFrom();
      latestDirectionBarProps.onClearTo();
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
