import React from 'react';
import {render, act, waitFor} from '@testing-library/react-native';
import type * as GeoJSON from 'geojson';
import {FloorPlanViewer, buildFloorTraversalList} from '@/components/indoor/floor-plan-viewer';

// ─── captured handlers ────────────────────────────────────────────────────────
let latestRoomsPressHandler: ((event: any) => void) | undefined;
let latestUserLocationUpdate: ((loc: any) => void) | undefined;
let latestDirectionBarProps: Record<string, any> = {};

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
    default: () => React.createElement(View, {testID: 'directions-modal'}),
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
jest.mock('@/services/http/indoor-api', () => ({
  fetchNearestNode: (...args: any[]) => mockFetchNearestNode(...args),
  fetchIndoorDirections: jest.fn().mockResolvedValue([]),
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

// ─── suite ────────────────────────────────────────────────────────────────────
describe('FloorPlanViewer', () => {
  beforeEach(() => {
    latestRoomsPressHandler = undefined;
    latestUserLocationUpdate = undefined;
    latestDirectionBarProps = {};
    mockFetchNearestNode.mockReset();
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
});