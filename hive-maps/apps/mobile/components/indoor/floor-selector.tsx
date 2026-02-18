import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FloorSummary } from '@/services/http/indoor-api'

export type FloorSelectorProps = {
  floors: FloorSummary[]
  activeFloorId: string | null
  onSelectFloor: (floorId: string) => void
  disabled?: boolean
}

export function FloorSelector({ floors, activeFloorId, onSelectFloor, disabled = false }: FloorSelectorProps) {
  if (floors.length === 0) return null

  return (
    <View testID="floor-selector" style={styles.container}>
      {floors.map((floor) => {
        const isActive = floor.id === activeFloorId
        const isDisabled = disabled || isActive

        return (
          <Pressable
            key={floor.id}
            testID={`floor-chip-${floor.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Floor ${floor.label}`}
            accessibilityHint="Switches the displayed indoor floor"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            disabled={isDisabled}
            onPress={() => onSelectFloor(floor.id)}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.activeChip,
              isDisabled && !isActive && styles.disabledChip,
              pressed && !isDisabled && styles.pressedChip,
            ]}
          >
            <Text style={[styles.chipText, isActive && styles.activeChipText]}>{floor.label}</Text>
            {isActive ? <View testID={`floor-chip-${floor.id}-active`} style={styles.activeMarker} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#9d1e30',
    gap: 6,
  },
  chip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8a1a2a',
  },
  chipText: {
    color: '#ffd6dc',
    fontWeight: '700',
    fontSize: 13,
  },
  activeChip: {
    backgroundColor: '#f59e0b',
  },
  activeChipText: {
    color: '#5a2110',
  },
  disabledChip: {
    opacity: 0.45,
  },
  pressedChip: {
    transform: [{ scale: 0.96 }],
  },
  activeMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    right: 6,
    top: 6,
    borderRadius: 4,
    backgroundColor: '#7c2d12',
  },
})
