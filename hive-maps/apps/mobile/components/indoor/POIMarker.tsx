import React from 'react'
import { StyleSheet, View } from 'react-native'
import ManIcon from '@mui/icons-material/Man'
import Woman2Icon from '@mui/icons-material/Woman2'
import WcIcon from '@mui/icons-material/Wc'
import AccessibleIcon from '@mui/icons-material/Accessible'
import EscalatorIcon from '@mui/icons-material/Escalator'
import StairsIcon from '@mui/icons-material/Stairs'
import ElevatorIcon from '@mui/icons-material/Elevator'

export type POIType =
  | 'bathroom'
  | 'bathroom_men'
  | 'bathroom_women'
  | 'bathroom_unisex'
  | 'bathroom_unisex_acc'
  | 'bathroom_men_acc'
  | 'bathroom_women_acc'
  | 'water_fountain'
  | 'stairs'
  | 'elevator'
  | 'escalator'

type POIMarkerProps = {
  type?: string | null
  size?: number
  color?: string
}

const DEFAULT_SIZE = 18
const DEFAULT_COLOR = '#9d1e30'

const ICON_BY_TYPE: Partial<Record<POIType, React.ComponentType<any>>> = {
  bathroom: WcIcon,
  bathroom_men: ManIcon,
  bathroom_women: Woman2Icon,
  bathroom_unisex: WcIcon,
  bathroom_unisex_acc: AccessibleIcon,
  bathroom_men_acc: AccessibleIcon,
  bathroom_women_acc: AccessibleIcon,
  stairs: StairsIcon,
  elevator: ElevatorIcon,
  escalator: EscalatorIcon,
}

const toKnownType = (value?: string | null): POIType | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase() as POIType
  if (normalized === 'water') return 'water_fountain'
  if (normalized in ICON_BY_TYPE || normalized === 'water_fountain') return normalized
  return null
}

export function POIMarker({ type, size = DEFAULT_SIZE, color = DEFAULT_COLOR }: POIMarkerProps) {
  const knownType = toKnownType(type)
  const Icon = knownType ? ICON_BY_TYPE[knownType] : null

  if (!knownType || !Icon) {
    return <View testID="poi-dot-fallback" style={[styles.dot, { width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: color }]} />
  }

  return <Icon data-testid={`poi-icon-${knownType}`} color={color} sx={{ fontSize: size }} />
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1,
    borderColor: '#ffffff',
  },
})

export default POIMarker
