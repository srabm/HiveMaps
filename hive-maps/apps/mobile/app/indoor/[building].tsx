import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function IndoorMapScreen() {
  const { building } = useLocalSearchParams<{ building: string }>();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText type="subtitle">{building} Building - Indoor Map</ThemedText>
      </View>

      <View style={styles.selectorRegion}>
        <Text style={styles.placeholderText}>[ Floor Selector Region ]</Text>
      </View>

      <View style={styles.rendererRegion}>
        <Text style={styles.placeholderText}>[ Mapbox Floor Plan Region ]</Text>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: { marginRight: 16 },
  selectorRegion: {
    height: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  rendererRegion: {
    flex: 1,
    backgroundColor: '#e6e6e6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { color: '#888', fontStyle: 'italic' }
});