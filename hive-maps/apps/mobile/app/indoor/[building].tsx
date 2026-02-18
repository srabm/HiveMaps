import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { fetchBuildingFloors, FloorSummary, BuildingCode } from '@/services/http/indoor-api';
import { FloorPlanViewer } from '@/components/indoor/floor-plan-viewer';

export default function IndoorMapScreen() {
  const { building } = useLocalSearchParams<{ building: string }>();
  const router = useRouter();
  
  const [floors, setFloors] = useState<FloorSummary[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadIndoorData() {
      setIsLoading(true);
      try {
        const campusId = ['VL', 'VE', 'CC'].includes(building) ? 'LOY' : 'SGW';
        
        const availableFloors = await fetchBuildingFloors(campusId, building as BuildingCode);
        setFloors(availableFloors);
        
        if (availableFloors.length > 0) {
          setActiveFloorId(availableFloors[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch indoor data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (building) {
      loadIndoorData();
    }
  }, [building]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText type="subtitle">{building} Building - Indoor Map</ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9d1e30" />
          <Text style={{ marginTop: 10 }}>Loading floor plans...</Text>
        </View>
      ) : (
        <>
          <View style={styles.selectorRegion}>
            <Text style={styles.placeholderText}>
              [ Floor Selector ] Active Floor: {activeFloorId || 'None'}
            </Text>
          </View>

          <View style={styles.rendererRegion}>
            <FloorPlanViewer />
          </View>
        </>
      )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
