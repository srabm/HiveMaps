import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CampusBadge } from '@/components/campus-badge';
import { CampusMarker } from '@/components/campus-marker';
import { CampusSwitch } from '@/components/campus-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNavigationController } from '@/controllers/navigation-controller';
import { MapboxGL } from '@/services/mapbox';
import { getApiBaseUrl } from '@/services/http/campus-api';

export default function MapScreen() {
  const {
    campus,
    setCampus,
    hydrated,
    points,
    loading,
    progress,
    campusMeta,
    tokenAvailable,
    mapsAdapter,
  } = useNavigationController();
  const colorScheme = useColorScheme();
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: campusMeta.center,
      zoomLevel: campusMeta.zoom,
      animationDuration: 800,
    });
  }, [campusMeta]);

  const theme = Colors[colorScheme ?? 'light'];

  const campusTitle = useMemo(
    () => `${campusMeta.name} Campus (${campusMeta.label})`,
    [campusMeta],
  );

  if (!tokenAvailable) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="title">Mapbox token missing</ThemedText>
        <ThemedText>
          Add `mapboxAccessToken` under `expo.extra` or set `EXPO_PUBLIC_MAPBOX_TOKEN` before running
          the app.
        </ThemedText>
      </ThemedView>
    );
  }

  if (!hydrated) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MapboxGL.MapView
        styleURL={mapsAdapter.defaultStyleURL}
        style={StyleSheet.absoluteFill}
        logoEnabled={false}
        scaleBarEnabled={false}>
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={campusMeta.center}
          zoomLevel={campusMeta.zoom}
        />
        <MapboxGL.UserLocation showsUserHeadingIndicator />
        {points.map((point) => (
          <MapboxGL.PointAnnotation
            key={point.id}
            id={point.id}
            coordinate={point.coordinate}
            title={point.building.name}>
            <CampusMarker code={point.building.code} name={point.building.name} />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      <View style={styles.topBar}>
        <CampusBadge campus={campus} />
        <CampusSwitch value={campus} onChange={setCampus} colorScheme={colorScheme} />
      </View>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <ThemedText type="subtitle">{campusTitle}</ThemedText>
        <ThemedText>
          Switch campuses to see building markers and walkways. Your choice is saved for next time.
        </ThemedText>
        {loading && (
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator />
            <ThemedText>
              Loading buildings… {progress.processed}/{progress.total} (found {progress.found})
            </ThemedText>
          </View>
        )}
        {!loading && points.length === 0 && (
          <ThemedText style={{ marginTop: 8 }}>
            No building markers loaded. Verify the backend is running ({getApiBaseUrl()}) and your
            Mapbox token is valid.
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  topBar: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
});
