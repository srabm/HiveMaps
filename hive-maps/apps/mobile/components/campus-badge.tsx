import { StyleSheet, View } from 'react-native';

import { campuses, type CampusId } from '@/constants/campus';
import { ThemedText } from '@/components/themed-text';

type Props = {
  campus: CampusId;
};

export function CampusBadge({ campus }: Readonly<Props>) {
  return (
    <View style={styles.badge} accessibilityRole="text" accessibilityLabel={`Campus ${campus}`}>
      <ThemedText type="defaultSemiBold" style={styles.text}>
        {campuses[campus].label} • {campuses[campus].name}
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
