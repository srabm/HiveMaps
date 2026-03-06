import React from 'react'
import { render } from '@testing-library/react-native'
import { POIMarker } from '@/components/indoor/POIMarker'

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react')
  const { Text } = require('react-native')

  return ({ testID }: { testID?: string }) => React.createElement(Text, { testID }, 'icon')
})

describe('POIMarker', () => {
  it.each([
    'bathroom',
    'water_fountain',
    'stairs',
    'elevator',
    'escalator',
  ])('renders icon for known type %s', (type) => {
    const { getByTestId, queryByTestId } = render(<POIMarker type={type} />)

    expect(getByTestId(`poi-icon-${type}`)).toBeTruthy()
    expect(queryByTestId('poi-dot-fallback')).toBeNull()
  })

  it('normalizes casing and whitespace for known types', () => {
    const { getByTestId } = render(<POIMarker type="  WATER_FOUNTAIN " />)
    expect(getByTestId('poi-icon-water_fountain')).toBeTruthy()
  })

  it('falls back to generic dot for unknown type', () => {
    const { getByTestId, queryByTestId } = render(<POIMarker type="printer" />)

    expect(getByTestId('poi-dot-fallback')).toBeTruthy()
    expect(queryByTestId('poi-icon-printer')).toBeNull()
  })

  it('falls back to generic dot for empty or missing type', () => {
    const empty = render(<POIMarker type="" />)
    expect(empty.getByTestId('poi-dot-fallback')).toBeTruthy()

    const missing = render(<POIMarker />)
    expect(missing.getByTestId('poi-dot-fallback')).toBeTruthy()
  })
})
