import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { FloorPlanViewer } from '@/components/indoor/floor-plan-viewer';
import { FloorSelector } from '@/components/indoor/floor-selector';
import { FloorIndicator } from '@/components/indoor/floor-indicator';
import {
  fetchBuildingFloors,
  fetchFloorDetails,
  fetchSupportedIndoorBuildings,
  FloorSummary,
  FloorDetailsResponse,
  normalizeIndoorBuildingCode,
  type IndoorCampusId,
  type SupportedIndoorBuilding,
} from '@/services/http/indoor-api';

const FALLBACK_NOTICE_DURATION_MS = 3500;

function normalizeFloorParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const first = value.find((item) => item?.trim().length);
    return first?.trim() || null;
  }
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function getRequestedFloorMatch(availableFloors: FloorSummary[], requestedFloor: string | null): FloorSummary | null {
  if (!requestedFloor) return null;
  const requested = requestedFloor.toLowerCase();
  return (
    availableFloors.find(
      (floor) => floor.id.toLowerCase() === requested || floor.label.toLowerCase() === requested,
    ) ?? null
  );
}

function resolveDefaultFloor(
  availableFloors: FloorSummary[],
  requestedFloor: string | null,
): { floorId: string | null; matchedRequestedFloor: boolean } {
  if (availableFloors.length === 0) return { floorId: null, matchedRequestedFloor: false };

  const requestedMatch = getRequestedFloorMatch(availableFloors, requestedFloor);
  if (requestedMatch) return { floorId: requestedMatch.id, matchedRequestedFloor: true };

  const sortedFloors = [...availableFloors].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstFloor = sortedFloors[0] ?? availableFloors[0];
  return {
    floorId: firstFloor?.id ?? null,
    matchedRequestedFloor: false,
  };
}

function getFallbackFloorId(
  availableFloors: FloorSummary[],
  currentFloorId: string,
  unavailableFloorIds: Set<string>,
): string | null {
  const sortedFloors = [...availableFloors].sort((a, b) => a.sortOrder - b.sortOrder);
  const fallback = sortedFloors.find(
    (floor) => floor.id !== currentFloorId && !unavailableFloorIds.has(floor.id),
  );
  return fallback?.id ?? null;
}

export default function IndoorMapScreen() {
  const { building, floor, campus } = useLocalSearchParams<{
    building: string;
    floor?: string | string[];
    campus?: string | string[];
  }>();
  const router = useRouter();

  const buildingCode = useMemo(
    () => normalizeIndoorBuildingCode(typeof building === 'string' ? building : null),
    [building],
  );
  const campusParam = useMemo(() => normalizeFloorParam(campus), [campus]);
  const requestedFloor = useMemo(() => normalizeFloorParam(floor), [floor]);

  const [floors, setFloors] = useState<FloorSummary[]>([]);
  const [resolvedBuilding, setResolvedBuilding] = useState<SupportedIndoorBuilding | null>(null);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [floorDetails, setFloorDetails] = useState<FloorDetailsResponse | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isResolvingBuilding, setIsResolvingBuilding] = useState(true);
  const [isLoadingFloors, setIsLoadingFloors] = useState(true);
  const [isLoadingFloorDetails, setIsLoadingFloorDetails] = useState(false);
  const [didFailBuildingSupportLookup, setDidFailBuildingSupportLookup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [directionsActive, setDirectionsActive] = useState(false);
  const unavailableFloorIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!noticeMessage) return;
    const timeout = setTimeout(() => setNoticeMessage(null), FALLBACK_NOTICE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [noticeMessage]);

  useEffect(() => {
    setSelectedRoomId(null);
  }, [activeFloorId]);

  useEffect(() => {
    let isCancelled = false;

    async function resolveBuildingSupport() {
      if (!buildingCode) {
        if (isCancelled) return;
        setDidFailBuildingSupportLookup(false);
        setResolvedBuilding(null);
        setIsResolvingBuilding(false);
        return;
      }

      setIsResolvingBuilding(true);
      setDidFailBuildingSupportLookup(false);
      try {
        const supportedBuildings = await fetchSupportedIndoorBuildings();
        if (isCancelled) return;

        const matches = supportedBuildings.filter(
          (candidate) => candidate.buildingCode.toUpperCase() === buildingCode,
        );
        const preferredCampus = campusParam?.toUpperCase();
        const resolved =
          matches.find((candidate) => candidate.campusId.toUpperCase() === preferredCampus) ?? matches[0] ?? null;

        setResolvedBuilding(resolved);
        setIsResolvingBuilding(false);
        setDidFailBuildingSupportLookup(false);
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to resolve supported indoor buildings:', error);
        unavailableFloorIdsRef.current = new Set();
        setFloors([]);
        setActiveFloorId(null);
        setFloorDetails(null);
        setSelectedRoomId(null);
        setNoticeMessage(null);
        setResolvedBuilding(null);
        setIsResolvingBuilding(false);
        setDidFailBuildingSupportLookup(true);
        setErrorMessage('Could not load indoor building metadata. Please try again.');
      }
    }

    setErrorMessage(null);
    resolveBuildingSupport();

    return () => {
      isCancelled = true;
    };
  }, [buildingCode, campusParam, reloadToken]);

  useEffect(() => {
    let isCancelled = false;

    async function loadIndoorData() {
      if (isResolvingBuilding) {
        if (isCancelled) return;
        setIsLoadingFloors(true);
        return;
      }

      if (!buildingCode || !resolvedBuilding) {
        if (isCancelled) return;
        unavailableFloorIdsRef.current = new Set();
        setFloors([]);
        setActiveFloorId(null);
        setFloorDetails(null);
        setSelectedRoomId(null);
        setNoticeMessage(null);
        setIsLoadingFloors(false);
        if (!buildingCode) {
          setErrorMessage('This building does not currently support indoor maps.');
          return;
        }
        if (didFailBuildingSupportLookup) {
          return;
        }
        setErrorMessage('This building does not currently support indoor maps.');
        return;
      }

      setIsLoadingFloors(true);
      setIsLoadingFloorDetails(false);
      unavailableFloorIdsRef.current = new Set();
      setErrorMessage(null);
      setNoticeMessage(null);
      setActiveFloorId(null);
      setFloorDetails(null);
      setSelectedRoomId(null);
      try {
        const campusId = resolvedBuilding.campusId as IndoorCampusId;
        const availableFloors = await fetchBuildingFloors(campusId, buildingCode);
        if (isCancelled) return;
        setFloors(availableFloors);

        if (availableFloors.length === 0) {
          setActiveFloorId(null);
          setFloorDetails(null);
          return;
        }

        const { floorId, matchedRequestedFloor } = resolveDefaultFloor(availableFloors, requestedFloor);
        setActiveFloorId(floorId);

        if (requestedFloor && !matchedRequestedFloor && floorId) {
          const fallbackLabel = availableFloors.find((candidate) => candidate.id === floorId)?.label ?? floorId;
          setNoticeMessage(`Floor ${requestedFloor} is unavailable. Showing ${fallbackLabel}.`);
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to fetch indoor floor list:', error);
        setErrorMessage('Could not load available floors. Please try again.');
      } finally {
        if (!isCancelled) setIsLoadingFloors(false);
      }
    }

    loadIndoorData();

    return () => {
      isCancelled = true;
    };
  }, [buildingCode, didFailBuildingSupportLookup, isResolvingBuilding, reloadToken, requestedFloor, resolvedBuilding]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFloorDetails() {
      if (!buildingCode || !resolvedBuilding || !activeFloorId) {
        setFloorDetails(null);
        return;
      }

      setIsLoadingFloorDetails(true);
      setErrorMessage(null);
      setFloorDetails(null);
      setSelectedRoomId(null);
      try {
        const campusId = resolvedBuilding.campusId as IndoorCampusId;
        const details = await fetchFloorDetails(campusId, buildingCode, activeFloorId);
        if (isCancelled) return;
        if (!details) {
          unavailableFloorIdsRef.current.add(activeFloorId);
          const fallbackFloorId = getFallbackFloorId(
            floors,
            activeFloorId,
            unavailableFloorIdsRef.current,
          );

          if (fallbackFloorId && fallbackFloorId !== activeFloorId) {
            const fallbackLabel = floors.find((candidate) => candidate.id === fallbackFloorId)?.label ?? fallbackFloorId;
            setNoticeMessage(`Floor ${activeFloorId} is unavailable. Switched to ${fallbackLabel}.`);
            setActiveFloorId(fallbackFloorId);
            return;
          }

          setFloorDetails(null);
          setErrorMessage(`Floor ${activeFloorId} is unavailable.`);
          return;
        }
        unavailableFloorIdsRef.current.delete(activeFloorId);
        setFloorDetails(details);
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to fetch indoor floor details:', error);
        setErrorMessage(`Could not load floor ${activeFloorId}. Please try again.`);
      } finally {
        if (!isCancelled) setIsLoadingFloorDetails(false);
      }
    }

    loadFloorDetails();
    return () => {
      isCancelled = true;
    };
  }, [activeFloorId, buildingCode, floors, reloadToken, resolvedBuilding]);

  const buildingTitle = buildingCode ? `${buildingCode} Building - Indoor Map` : 'Indoor Map';
  const isInitialLoading = isLoadingFloors && floors.length === 0;
  const hasNoFloors = !isLoadingFloors && !errorMessage && floors.length === 0;
  const activeFloor = useMemo(
    () => floors.find((floorItem) => floorItem.id === activeFloorId) ?? null,
    [floors, activeFloorId],
  );
  const selectorFloors = useMemo(
    () => [...floors].sort((a, b) => b.sortOrder - a.sortOrder),
    [floors],
  );
  const currentFloorLabel = floorDetails?.floor?.label ?? activeFloor?.label ?? activeFloorId;

  const handleRetry = () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setReloadToken((token) => token + 1);
  };

  const handleSelectFloor = (nextFloorId: string) => {
    if (nextFloorId === activeFloorId) return;
    setErrorMessage(null);
    setNoticeMessage(null);
    setActiveFloorId(nextFloorId);
  };

  return (
    <ThemedView style={styles.container}>
      {Stack?.Screen ? <Stack.Screen options={{ headerShown: false }} /> : null}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText type="subtitle">{buildingTitle}</ThemedText>
      </View>

      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9d1e30" />
          <Text style={{ marginTop: 10 }}>Loading floor plans...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.messageContainer}>
          <ThemedText style={styles.messageText}>{errorMessage}</ThemedText>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : hasNoFloors ? (
        <View style={styles.messageContainer}>
          <ThemedText style={styles.messageText}>No floors are available for this building yet.</ThemedText>
        </View>
      ) : (
        <View style={styles.rendererRegion}>
          <FloorPlanViewer
            planGeometry={floorDetails?.planGeometry}
            rooms={floorDetails?.rooms}
            selectedRoomId={selectedRoomId}
            onPressRoom={setSelectedRoomId}
            onDirectionsActiveChange={setDirectionsActive}
            buildingCode={buildingCode ?? ''}
            floorId={activeFloorId ?? ''}
            onError={setNoticeMessage}
          />

          {noticeMessage ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{noticeMessage}</Text>
            </View>
          ) : null}

          {!directionsActive && <View style={styles.selectorOverlay} pointerEvents="box-none">
            <FloorSelector
              floors={selectorFloors}
              activeFloorId={activeFloorId}
              onSelectFloor={handleSelectFloor}
              disabled={isLoadingFloors || isLoadingFloorDetails}
            />
          </View>}

          {!directionsActive && <View style={styles.indicatorOverlay} pointerEvents="box-none">
            <FloorIndicator buildingCode={buildingCode} floorLabel={currentFloorLabel} />
          </View>}

          {isLoadingFloorDetails ? (
            <View style={styles.viewerLoadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#9d1e30" />
              <Text style={styles.viewerLoadingText}>Loading selected floor...</Text>
            </View>
          ) : null}
        </View>
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
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#9d1e30',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  rendererRegion: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  noticeBanner: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 25,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.84)',
  },
  noticeText: {
    color: '#f9fafb',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  selectorOverlay: {
    position: 'absolute',
    right: 14,
    bottom: 96,
    zIndex: 30,
  },
  indicatorOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    alignItems: 'center',
    zIndex: 30,
  },
  viewerLoadingOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 62,
    alignItems: 'center',
    zIndex: 35,
  },
  viewerLoadingText: {
    marginTop: 8,
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
});
