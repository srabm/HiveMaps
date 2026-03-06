import React from 'react'
import { StyleSheet, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

export type POIType = 'bathroom' | 'water_fountain' | 'stairs' | 'elevator' | 'escalator'

type POIMarkerProps = {
  type?: string | null
  size?: number
  color?: string
}

const DEFAULT_SIZE = 18
const DEFAULT_COLOR = '#9d1e30'

const ICON_BY_TYPE: Record<POIType, React.ComponentProps<typeof MaterialIcons>['name']> = {
  bathroom: 'wc',
  water_fountain: 'local-drink',
  stairs: 'stairs',
  elevator: 'elevator',
  escalator: 'escalator-warning',
}

const toKnownType = (value?: string | null): POIType | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized in ICON_BY_TYPE) return normalized as POIType
  return null
}

export function POIMarker({ type, size = DEFAULT_SIZE, color = DEFAULT_COLOR }: POIMarkerProps) {
  const knownType = toKnownType(type)

  if (!knownType) {
    return <View testID="poi-dot-fallback" style={[styles.dot, { width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: color }]} />
  }

  return <MaterialIcons testID={`poi-icon-${knownType}`} name={ICON_BY_TYPE[knownType]} size={size} color={color} />
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1,
    borderColor: '#ffffff',
  },
})

export default POIMarker
