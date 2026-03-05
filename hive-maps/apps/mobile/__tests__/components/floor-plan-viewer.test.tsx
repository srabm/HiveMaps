import React from 'react'
import { render, act } from '@testing-library/react-native'
import type * as GeoJSON from 'geojson'
import { FloorPlanViewer } from '@/components/indoor/floor-plan-viewer'

let latestRoomsPressHandler: ((event: any) => void) | undefined

jest.mock('@/services/mapbox', () => {
  const React = require('react')
  const { View } = require('react-native')

  const ShapeSource = ({ children, onPress, testID }: any) => {
    if (testID === 'indoor-rooms-source') {
      latestRoomsPressHandler = onPress
    }
    return React.createElement(View, null, children)
  }

  return {
    MapboxGL: {
      MapView: ({ children }: any) => React.createElement(View, null, children),
      Camera: () => null,
      UserLocation: () => null,
      ShapeSource,
      FillLayer: () => null,
      LineLayer: () => null,
      SymbolLayer: () => null,
    },
  }
})

jest.mock('@/components/directions-bars', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(View, null),
  }
})

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
}))

jest.mock('@/components/indoor/room-label-layer', () => ({
  RoomLabelLayer: () => null,
}))

jest.mock('@/components/search-bar', () => {
  const React = require('react')
  const { View } = require('react-native')

  return {
    __esModule: true,
    default: () => React.createElement(View, null),
  }
})

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
})

const makeRooms = (): GeoJSON.FeatureCollection => ({
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
})

describe('FloorPlanViewer', () => {
  beforeEach(() => {
    latestRoomsPressHandler = undefined
  })

  it('renders Day 1 placeholder when geometry/rooms are missing', () => {
    const { getByText } = render(<FloorPlanViewer buildingCode="H" floorId="8" />)
    expect(getByText('Floor plan viewer wired')).toBeTruthy()
  })

  it('calls onPressRoom with room id when a room is pressed', () => {
    const onPressRoom = jest.fn()
    render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        onPressRoom={onPressRoom}
        buildingCode="H"
        floorId="8"
      />,
    )

    expect(latestRoomsPressHandler).toBeDefined()

    act(() => {
      latestRoomsPressHandler?.({
        features: [
          {
            id: 'H-101',
            properties: { label: 'H-101' },
          },
        ],
      })
    })

    expect(onPressRoom).toHaveBeenCalledWith('H-101')
  })

  it('shows selected room info card', () => {
    const { getByTestId, getByText } = render(
      <FloorPlanViewer
        planGeometry={makePlanGeometry()}
        rooms={makeRooms()}
        selectedRoomId="H-101"
        buildingCode="H"
        floorId="8"
      />,
    )

    expect(getByTestId('indoor-room-info-card')).toBeTruthy()
    expect(getByText('Selected room: H-101')).toBeTruthy()
  })
})
