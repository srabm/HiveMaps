import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MapScreenWebFallback() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Map not available on Web preview</ThemedText>
      <ThemedText>
        The Map tab uses the native Mapbox SDK. Please run on iOS/Android or a native emulator with a
        valid Mapbox token configured.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
});
