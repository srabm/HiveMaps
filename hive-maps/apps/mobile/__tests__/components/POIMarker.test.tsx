import React from 'react'
import { render } from '@testing-library/react-native'
import { POIMarker } from '@/components/indoor/POIMarker'

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native')
  return {
    MaterialIcons: ({ name, testID }: { name: string; testID: string }) => (
      <Text testID={testID}>{name}</Text>
    ),
  }
})

describe('POIMarker', () => {
  it.each([
    'bathroom',
    'bathroom_men',
    'bathroom_women',
    'bathroom_unisex',
    'bathroom_unisex_acc',
    'bathroom_men_acc',
    'bathroom_women_acc',
    'bathroom_private_acc',
    'water_fountain',
    'stairs',
    'elevator',
    'escalator',
    'printer',
    'ramp'
  ])('renders icon for known type %s', (type) => {
    const { getByTestId, queryByTestId } = render(<POIMarker type={type} />)

    expect(getByTestId(`poi-icon-${type}`)).toBeTruthy()
    expect(queryByTestId('poi-label-fallback')).toBeNull()
  })

  it('normalizes casing and whitespace for known types', () => {
    const { getByTestId } = render(<POIMarker type="  BATHROOM_MEN  " />)
    expect(getByTestId('poi-icon-bathroom_men')).toBeTruthy()
  })

  it('falls back to text label pill for unknown type', () => {
    const { getByTestId, getByText } = render(<POIMarker type="unknown_magic_room" label="Narnia" />)

    expect(getByTestId('poi-label-fallback')).toBeTruthy()
    expect(getByText('Narnia')).toBeTruthy()
  })
  
  it('uses type string as fallback label if no label is provided', () => {
    const { getByTestId, getByText } = render(<POIMarker type="mystery_box" />)

    expect(getByTestId('poi-label-fallback')).toBeTruthy()
    expect(getByText('mystery_box')).toBeTruthy()
  })

  it('falls back to empty generic label for empty or missing type', () => {
    const empty = render(<POIMarker type="" />)
    expect(empty.getByTestId('poi-label-fallback')).toBeTruthy()

    const missing = render(<POIMarker />)
    expect(missing.getByTestId('poi-label-fallback')).toBeTruthy()
  })
})