import { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BuildingInfo = {
  campus?: string;
  code?: string;
  name?: string;
  addresses?: string[];
  hasIndoorMap?: boolean;
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
  onIndoorMap,
}: Readonly<BuildingInfoModalProps>) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [isMinimized, setIsMinimized] = useState(false);
  const noop = () => {};
  const accessibilityItems = building?.accessibility?.length
    ? building.accessibility
    : FALLBACK_ACCESSIBILITY;

  const hasIndoorMap = !!building?.hasIndoorMap;
  const animateSheetLayout = () => {
    LayoutAnimation.configureNext({
      duration: 650,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };
  const setMinimizedState = (nextState: boolean) => {
    animateSheetLayout();
    setIsMinimized(nextState);
  };
  const toggleMinimized = () => setMinimizedState(!isMinimized);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (visible) setIsMinimized(false);
  }, [visible, building?.name]);

  const dragHandleResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 24) {
            setMinimizedState(true);
            return;
          }
          if (gestureState.dy < -24) {
            setMinimizedState(false);
          }
        },
      }),
    [isMinimized]
  );

  if (!visible) {
    return null;
  }

  return (
      <View pointerEvents="box-none" style={styles.sheetRoot}>
        {!isMinimized ? <Pressable style={styles.modalBackdrop} onPress={onClose} /> : null}
        <View pointerEvents="box-none" style={styles.sheetContainer}>
        <ThemedView style={[styles.modalCard, { backgroundColor: theme.background }]}>
          <View style={styles.sheetHeader} {...dragHandleResponder.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.sheetActions}>
              <Pressable testID="building-minimize-button" onPress={toggleMinimized} style={styles.sheetActionButton}>
                <MaterialIcons
                  name={isMinimized ? 'keyboard-arrow-up' : 'remove'}
                  size={20}
                  color="#6b7280"
                />
              </Pressable>
              <Pressable testID="building-close-button" onPress={onClose} style={styles.sheetActionButton}>
                <MaterialIcons name="close" size={18} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <View testID={isMinimized ? 'building-modal-minimized' : 'building-modal-expanded'}>
            <ThemedText type="subtitle" style={styles.title}>
              {building?.name ?? 'Selected Building'}
            </ThemedText>

            <View style={styles.addressRow}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="place" size={16} color="#9d1e30" />
              </View>
              <ThemedText style={styles.addressText}>
                {building?.addresses?.[0] ?? 'Address unavailable'}
              </ThemedText>
            </View>

            {building?.campus ? (
              <ThemedText style={styles.campusText}>{building.campus}</ThemedText>
            ) : null}

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={onDirections ?? noop}
              >
                <View style={styles.actionButtonContent}>
                  <MaterialIcons name="directions" size={14} color="#ffffff" />
                  <ThemedText style={styles.actionText}>Directions</ThemedText>
                </View>
              </Pressable>

              {hasIndoorMap && (
                <Pressable
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={onIndoorMap ?? noop}
                >
                  <View style={styles.actionButtonContent}>
                    <MaterialIcons name="map" size={14} color="#ffffff" />
                    <ThemedText style={styles.actionText}>Indoor</ThemedText>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {!isMinimized ? (
            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="schedule" size={18} color="#9d1e30" />
                </View>
                <View style={styles.detailTextWrap}>
                  <ThemedText style={styles.detailLabel}>Hours</ThemedText>
                    {Array.isArray((building as any)?.allHours) ? (
                      (building as any).allHours.map((day: string) => (
                        <ThemedText key={day} style={[styles.detailValue, { fontSize: 11}]}>
                          {day}
                        </ThemedText>
                      ))
                    ) : (
                      <ThemedText style={styles.detailValue}>
                        {building?.hours ?? 'Hours not listed'}
                      </ThemedText>
                    )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="phone" size={18} color="#9d1e30" />
                </View>
                <View style={styles.detailTextWrap}>
                  <ThemedText style={styles.detailLabel}>Phone</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {building?.phone ?? 'Phone not listed'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="public" size={18} color="#9d1e30" />
                </View>
                <View style={styles.detailTextWrap}>
                  <ThemedText style={styles.detailLabel}>Website</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {building?.website ?? 'Website not listed'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.sectionHeaderCompact}>
                <ThemedText style={styles.sectionTitle}>Accessibility</ThemedText>
              </View>

              {accessibilityItems?.map((item, index) => (
                <View key={`${item.label}-${index}`} style={styles.accessibilityRow}>
                  <View style={styles.accessibilityIcon}>
                    <MaterialIcons
                      name={(item.iconName as any) ?? 'accessible'}
                      size={18}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.accessibilityTextWrap}>
                    <ThemedText style={styles.accessibilityLabel}>{item.label}</ThemedText>
                    {item.description ? (
                      <ThemedText style={styles.accessibilityDescription}>
                        {item.description}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </ThemedView>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 18,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 6,
  },
  sheetActions: {
    position: 'absolute',
    right: -4,
    top: -2,
    flexDirection: 'row',
    gap: 4,
  },
  sheetActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  locationIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 14,
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingRight: 6,
  },
  campusText: {
    fontSize: 12,
    opacity: 0.65,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  actionButton: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPrimary: {
    backgroundColor: '#9d1e30',
    borderColor: '#9d1e30',
  },
  actionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  imageWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    opacity: 0.6,
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
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailsScroll: {
    marginTop: 2,
  },
  accessibilityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  accessibilityIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#9d1e30',
    opacity: 0.9,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessibilityTextWrap: {
    flex: 1,
  },
  accessibilityLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  accessibilityDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
});
