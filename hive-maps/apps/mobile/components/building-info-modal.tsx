import { Image, Modal, Pressable, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SUPPORTED_INDOOR_BUILDINGS, parseIndoorBuildingCode } from '@/services/http/indoor-api';

export type BuildingInfo = {
  code?: string;
  name?: string;
  addresses?: string[];
  campus?: string;
  imageUrl?: string;
  accessibility?: Array<{ label: string; description?: string; iconName?: string }>;
  hours?: string;
  phone?: string;
  website?: string;
};

type BuildingInfoModalProps = {
  visible: boolean;
  building: BuildingInfo | null;
  onClose: () => void;
  onDirections?: () => void;
  onStart?: () => void;
  onFavorite?: () => void;
  onIndoorMap?: () => void;
};

const FALLBACK_ACCESSIBILITY: BuildingInfo['accessibility'] = [
  {
    label: 'Accessible entrance',
    description: 'Automated accessible entrance door.',
    iconName: 'accessible',
  },
  {
    label: 'Accessible elevator',
    description: 'Elevator access to all public floors.',
    iconName: 'elevator',
  },
];

export function BuildingInfoModal({
  visible,
  building,
  onClose,
  onDirections,
  onStart,
  onFavorite,
  onIndoorMap,
}: BuildingInfoModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  if (!visible) return null;

  const indoorBuildingCode = parseIndoorBuildingCode(building?.code);
  const hasIndoorMap = indoorBuildingCode && SUPPORTED_INDOOR_BUILDINGS.has(indoorBuildingCode);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: themeColors.background }]} onPress={() => {}}>
          {/* Draggable Indicator */}
          <View style={styles.dragIndicator} />

          {/* Header Image */}
          <View style={styles.imageContainer}>
            {building?.imageUrl ? (
              <Image source={{ uri: building.imageUrl }} style={styles.buildingImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons name="image" size={48} color="#ccc" />
                <ThemedText style={styles.imagePlaceholderText}>Building photo</ThemedText>
              </View>
            )}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Content Body */}
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">{building?.name || 'Selected Building'}</ThemedText>
                <ThemedText style={styles.addressText}>
                  {building?.addresses?.[0] || 'Address unavailable'}
                </ThemedText>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <ActionButton 
                icon="directions" 
                label="Directions" 
                onPress={onDirections} 
                primary 
              />
              <ActionButton 
                icon="navigation" 
                label="Start" 
                onPress={onStart} 
              />
              
              {hasIndoorMap && (
                 <ActionButton 
                 icon="map" 
                 label="Indoor" 
                 onPress={onIndoorMap}
                 color="#9d1e30"
               />
              )}
              
              <ActionButton 
                icon="favorite-border" 
                label="Favourites" 
                onPress={onFavorite} 
              />
            </View>

            {/* Info Section: Hours, Phone, Website */}
            <View style={styles.sectionHeaderCompact}>
              <ThemedText style={styles.sectionTitle}>Details</ThemedText>
            </View>
            
            <DetailRow icon="access-time" text={building?.hours || 'Hours not listed'} />
            <DetailRow icon="phone" text={building?.phone || 'Phone not listed'} />
            <DetailRow icon="public" text={building?.website || 'Website not listed'} />

            {/* Accessibility Section */}
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Accessibility</ThemedText>
            </View>
            {(building?.accessibility || FALLBACK_ACCESSIBILITY)?.map((item, idx) => (
              <View key={idx} style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name={item.iconName as any || 'check-circle'} size={14} color="#555" />
                </View>
                <View style={styles.detailTextWrap}>
                  <ThemedText style={styles.detailLabel}>{item.label}</ThemedText>
                  {item.description && (
                    <ThemedText style={styles.detailDesc}>{item.description}</ThemedText>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Sub-components for cleaner render code
function ActionButton({ 
  icon, 
  label, 
  onPress, 
  primary, 
  color 
}: { 
  icon: any; 
  label: string; 
  onPress?: () => void; 
  primary?: boolean;
  color?: string;
}) {
  const bg = color ? color : (primary ? '#2563eb' : '#f0f0f0');
  const fg = primary || color ? '#fff' : '#000';

  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={fg} />
      <Text style={[styles.actionBtnText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.detailRow}>
      <MaterialIcons name={icon} size={18} color="#666" style={{ marginRight: 8, marginTop: 1 }} />
      <ThemedText style={{ fontSize: 14, flex: 1 }}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#eee',
    position: 'relative',
  },
  buildingImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    opacity: 0.6,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
    marginBottom: 8,
  },
  sectionHeaderCompact: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  detailIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#f2e6e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailDesc: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});
