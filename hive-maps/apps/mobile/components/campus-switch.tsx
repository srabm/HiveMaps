import { Pressable, StyleSheet, View } from 'react-native';

import { CampusId, campuses } from '@/constants/campus';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

type Props = {
  value: CampusId;
  onChange: (campus: CampusId) => void;
  colorScheme?: 'light' | 'dark' | null;
};

const options: CampusId[] = ['SGW', 'LOY'];

export function CampusSwitch({ value, onChange, colorScheme }: Props) {
  const theme = Colors[colorScheme ?? 'light'];
  return (
    <View style={[styles.segment, { borderColor: theme.tint }]}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[
              styles.option,
              selected && { backgroundColor: theme.tint },
              selected && styles.selectedShadow,
            ]}>
            <ThemedText
              style={[
                styles.label,
                { color: selected ? '#fff' : theme.text },
                selected && styles.bold,
              ]}>
              {campuses[option].label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  bold: { fontWeight: '700' },
  selectedShadow: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
});
