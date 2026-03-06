import React from 'react'
import { render } from '@testing-library/react-native'
import { POIMarker } from '@/components/indoor/POIMarker'

const makeMuiIconMock = () => {
  const React = require('react')
  const { Text } = require('react-native')

  return ({ testID, ['data-testid']: dataTestId }: { testID?: string; 'data-testid'?: string }) =>
    React.createElement(Text, { testID: testID ?? dataTestId }, 'icon')
}

jest.mock('@mui/icons-material/Man', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Woman2', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Wc', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Accessible', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Escalator', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Stairs', () => makeMuiIconMock(), { virtual: true })
jest.mock('@mui/icons-material/Elevator', () => makeMuiIconMock(), { virtual: true })

describe('POIMarker', () => {
  it.each([
    'bathroom',
    'bathroom_men',
    'bathroom_women',
    'bathroom_unisex',
    'bathroom_unisex_acc',
    'bathroom_men_acc',
    'bathroom_women_acc',
    'stairs',
    'elevator',
    'escalator',
  ])('renders icon for known type %s', (type) => {
    const { getByTestId, queryByTestId } = render(<POIMarker type={type} />)

    expect(getByTestId(`poi-icon-${type}`)).toBeTruthy()
    expect(queryByTestId('poi-dot-fallback')).toBeNull()
  })

  it('normalizes casing and whitespace for known types', () => {
    const { getByTestId } = render(<POIMarker type="  BATHROOM_MEN  " />)
    expect(getByTestId('poi-icon-bathroom_men')).toBeTruthy()
  })

  it('falls back to generic dot for water_fountain (no icon configured)', () => {
    const { getByTestId, queryByTestId } = render(<POIMarker type="water_fountain" />)

    expect(getByTestId('poi-dot-fallback')).toBeTruthy()
    expect(queryByTestId('poi-icon-water_fountain')).toBeNull()
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
