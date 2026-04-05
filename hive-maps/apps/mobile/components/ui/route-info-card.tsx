import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type RouteInfoCardProps = {
  distanceMeters: number;
  durationSeconds: number;
  position?: 'top' | 'bottom';
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

export function RouteInfoCard({
  distanceMeters,
  durationSeconds,
  position = 'bottom',
}: Readonly<RouteInfoCardProps>) {
  return (
    <View
      style={[
        styles.infoCard,
        position === 'top' ? styles.infoCardTop : styles.infoCardBottom,
      ]}
    >
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Distance</Text>
        <Text style={styles.infoValue}>{formatDistance(distanceMeters)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Duration</Text>
        <Text style={styles.infoValue}>{formatDuration(durationSeconds)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  infoCardTop: { top: 20 },
  infoCardBottom: { bottom: 20 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: '600', color: '#111827' },
  divider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
});
