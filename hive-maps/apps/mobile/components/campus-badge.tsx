import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CampusMeta } from '@/types/campus';

type Props = {
  campus: CampusMeta;
};

export function CampusBadge({ campus }: Readonly<Props>) {
  return (
    <View style={styles.badge} accessibilityRole="text" accessibilityLabel={`Campus ${campus.id}`}>
      <ThemedText type="defaultSemiBold" style={styles.text}>
        {campus.label} • {campus.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    color: '#fff',
    fontSize: 13,
  },
});
