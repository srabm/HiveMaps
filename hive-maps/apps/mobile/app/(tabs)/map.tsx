import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View, Text, Image } from 'react-native';

import { CampusBadge } from '@/components/campus-badge';
import { CampusSwitch } from '@/components/campus-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNavigationController } from '@/controllers/navigation-controller';
import { MapboxGL } from '@/services/mapbox';

// --- LOAD LOCAL IMAGE ---
const HONEYCOMB_IMAGE = require('@/assets/images/honeycomb.png');

export default function MapScreen() {
  const SHOW_FOOTER = false;
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

  // --- FEATURE BUILDER ---
  const { polygonFeatures, dotPoints } = useMemo(() => {
    const polys = [];
    const dots = [];

    for (const point of points) {
      const loc = point.building.location as any;
      if (loc && loc.type === 'Polygon' && loc.coordinates) {
        let coords = loc.coordinates;
        // Bracket Fixer
        let depth = 0;
        let current = coords;
        while (Array.isArray(current)) { depth++; current = current[0]; }
        if (depth === 4) { coords = coords[0]; }      
        else if (depth === 2) { coords = [coords]; }  

        polys.push({
          type: 'Feature' as const,
          id: point.id,
          geometry: { type: 'Polygon' as const, coordinates: coords },
          properties: { name: point.building.name },
        });
      } else {
        dots.push(point);
      }
    }
    return { polygonFeatures: polys, dotPoints: dots };
  }, [points]);

  const shapeCollection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: polygonFeatures,
  }), [polygonFeatures]);

  if (!tokenAvailable) return <ThemedView style={styles.centered}><ThemedText>No Token</ThemedText></ThemedView>;
  if (!hydrated) return <ThemedView style={styles.centered}><ActivityIndicator /></ThemedView>;

  return (
    <ThemedView style={styles.container}>
      <MapboxGL.MapView
        styleURL={mapsAdapter.defaultStyleURL}
        style={StyleSheet.absoluteFill}
        logoEnabled={false}
        scaleBarEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={campusMeta.center}
          zoomLevel={campusMeta.zoom}
        />
        <MapboxGL.UserLocation showsUserHeadingIndicator />

        {/* --- 1. LOAD AND SHRINK THE IMAGE --- */}
        <MapboxGL.Images 
           images={{ 
             honeycomb: { 
                uri: Image.resolveAssetSource(HONEYCOMB_IMAGE).uri, 
                scale: 10.0 // <--- THIS IS THE MAGIC! It shrinks the image by 10x.
             } 
           }} 
        />

        {/* --- 2. SHAPE SOURCE --- */}
        {polygonFeatures.length > 0 && (
          <MapboxGL.ShapeSource
            id="campus-buildings-source"
            shape={shapeCollection}
          >
            {/* LAYER A: Burgundy Background */}
            <MapboxGL.FillLayer
              id="campus-buildings-base"
              aboveLayerID="road-label" 
              style={{
                fillColor: '#9d1e30', 
                fillOpacity: 0.6, 
              }}
            />

            {/* LAYER B: The Honeycomb Pattern */}
            <MapboxGL.FillLayer
              id="campus-buildings-pattern"
              aboveLayerID="campus-buildings-base" 
              style={{
                fillPattern: 'honeycomb', 
                fillOpacity: 1.0, 
              }}
            />
            
            {/* LAYER C: Outline (White) */}
            <MapboxGL.LineLayer
              id="campus-buildings-outline"
              aboveLayerID="campus-buildings-pattern"
              style={{
                lineColor: '#ffffff',
                lineWidth: 2,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* --- MARKERS --- */}
        {dotPoints.map((point) => (
          <MapboxGL.PointAnnotation
            key={point.id}
            id={point.id}
            coordinate={point.coordinate}
          >
             <View style={styles.markerPin}>
                <Text style={styles.markerText}>M</Text>
             </View>
          </MapboxGL.PointAnnotation>
        ))}

      </MapboxGL.MapView>

      <View style={styles.topBar}>
        <CampusBadge campus={campus} />
      </View>

      <View style={styles.switchContainer}>
        <CampusSwitch value={campus} onChange={setCampus} colorScheme={colorScheme} />
      </View>

      {SHOW_FOOTER && (
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">{campusTitle}</ThemedText>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <ThemedText style={{ fontSize: 10, marginRight: 5 }}>Pattern Check:</ThemedText>
            <View style={{ backgroundColor: '#9d1e30', padding: 2, borderWidth: 1, borderColor: 'white' }}>
              <Image
                source={HONEYCOMB_IMAGE}
                style={{ width: 40, height: 40, resizeMode: 'contain' }}
              />
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markerPin: {
    height: 28, width: 28, backgroundColor: '#ffffff', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  markerText: { color: '#9d1e30', fontWeight: '900', fontSize: 14 },
  topBar: {
    position: 'absolute', top: 20, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  switchContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10
  },
});
