import { StyleSheet, Text, View } from 'react-native'
import { BuildingCode } from '@/services/http/indoor-api'

export type FloorIndicatorProps = {
  buildingCode: BuildingCode | null
  floorLabel: string | null
}

export function FloorIndicator({ buildingCode, floorLabel }: FloorIndicatorProps) {
  if (!buildingCode && !floorLabel) return null

  const title = buildingCode ? `${buildingCode} Building` : 'Indoor Map'
  const subtitle = floorLabel ? `Current floor: ${floorLabel}` : 'Current floor unavailable'

  return (
    <View
      testID="floor-indicator"
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle}.`}
      style={styles.container}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    minWidth: 180,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#9d1e30',
    borderWidth: 1,
    borderColor: '#7d1726',
    alignItems: 'center',
  },
  title: {
    color: '#fef2f2',
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: '#ffe4e6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
})
