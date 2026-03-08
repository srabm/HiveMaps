import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

export type POIType =
  | 'bathroom'
  | 'bathroom_men'
  | 'bathroom_women'
  | 'bathroom_unisex'
  | 'bathroom_unisex_acc'
  | 'bathroom_men_acc'
  | 'bathroom_women_acc'
  | 'bathroom_private_acc'
  | 'water_fountain'
  | 'stairs'
  | 'elevator'
  | 'escalator'
  | 'printer'
  | 'ramp'

type POIMarkerProps = {
  type?: string | null
  label?: string | null
  size?: number
  color?: string
}

const DEFAULT_SIZE = 22
const DEFAULT_COLOR = '#9d1e30'

const ICON_BY_TYPE: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  bathroom: 'wc',
  bathroom_men: 'man',
  bathroom_women: 'woman',
  bathroom_unisex: 'wc',
  bathroom_unisex_acc: 'accessible',
  bathroom_men_acc: 'accessible',
  bathroom_women_acc: 'accessible',
  bathroom_private_acc: 'lock',
  water_fountain: 'water-drop',
  stairs: 'stairs',
  elevator: 'elevator',
  escalator: 'escalator',
  printer: 'print',
  ramp: 'accessible-forward', 
}

const toKnownType = (value?: string | null): POIType | null => {
  if (!value) return null
  let normalized = value.trim().toLowerCase()
  if (normalized === 'water') normalized = 'water_fountain'
  if (normalized in ICON_BY_TYPE) return normalized as POIType
  return null
}

export function POIMarker({ type, label, size = DEFAULT_SIZE, color = DEFAULT_COLOR }: POIMarkerProps) {
  const knownType = toKnownType(type)

  if (!knownType) {
    return (
      <View style={styles.poiLabelFallback} testID="poi-label-fallback">
        <Text style={styles.poiLabelFallbackText}>{label || type}</Text>
      </View>
    )
  }

  const isPrivateAcc = knownType === 'bathroom_private_acc'
  const isAccBathroom = ['bathroom_unisex_acc', 'bathroom_men_acc', 'bathroom_women_acc'].includes(knownType) || isPrivateAcc

  if (isAccBathroom) {
    const baseGenderType = isPrivateAcc ? 'bathroom_unisex' : knownType.replace('_acc', '') as POIType
    const baseIconName = ICON_BY_TYPE[baseGenderType]

    return (
      <View style={styles.multiIconContainer} testID={`poi-icon-${knownType}`}>
        <MaterialIcons name={baseIconName as any} size={size * 0.85} color={color} />
        <View style={styles.iconSpacer} />
        
        <MaterialIcons name="accessible" size={size * 0.85} color={color} />
        
        {isPrivateAcc && (
          <>
            <View style={styles.iconSpacer} />
            <MaterialIcons name="lock" size={size * 0.75} color={color} />
          </>
        )}
      </View>
    )
  }

  const iconName = ICON_BY_TYPE[knownType]
  return (
    <MaterialIcons 
      name={iconName as any} 
      size={size} 
      color={color} 
      testID={`poi-icon-${knownType}`} 
    />
  )
}

const styles = StyleSheet.create({
  poiLabelFallback: {
    backgroundColor: '#9d1e30',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  poiLabelFallbackText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  multiIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(157, 30, 48, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
  iconSpacer: {
    width: 3,
  },
})