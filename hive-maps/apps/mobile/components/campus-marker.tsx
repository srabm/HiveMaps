import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  code: string;
  name: string;
};

export function CampusMarker({ code, name }: Props) {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={name}>
      <View style={styles.pin} />
      <View style={styles.label}>
        <ThemedText type="defaultSemiBold" style={styles.labelText}>
          {code}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  pin: {
    width: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 4,
  },
  label: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelText: { color: '#fff', fontSize: 12 },
});
