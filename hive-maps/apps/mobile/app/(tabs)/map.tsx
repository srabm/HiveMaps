import { Href, useRouter } from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, View, Text, Image, Modal, Pressable, Platform, LayoutChangeEvent} from 'react-native';

import DirectionBar from "@/components/directions-bars";
import { PolygonUtils } from '@/domain/PolygonUtils';
import { CampusBadge } from '@/components/campus-badge';
import { CampusSwitch } from '@/components/campus-switch';
import { BuildingInfoModal } from '@/components/building-info-modal';
import { LocateMeButton } from '@/components/locate-me-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNavigationController } from '@/controllers/navigation-controller';
import { MapboxGL } from '@/services/mapbox';
import MapSearchBar from '@/components/search-bar';
import {Coordinates, MapLocation} from '@/services/maps/maps-provider';
import {DirectionsLine} from "@/components/ui/directions-line";
import {NavigationBottom} from "@/components/ui/navigation-bottom";
import { NextClassPrompt } from '@/components/next-class-prompt';
import {
    DirectionsResponse,
    DirectionsRequest,
    Step,
    TransportMode,
    Provider,
    initializeDirectionsCache,
    addDirectionsListener,
    getDirections,
} from '@/services/maps/directions-api-adapter';
import {fetchIndoorDirections, fetchIndoorEntrances, fetchIndoorRooms, type IndoorDirectionsResponse, type IndoorNodeResponse} from '@/services/http/indoor-api';
import {useShuttleRouting} from '@/hooks/use-shuttle-routing';
import {ShuttleRouteOverlay} from '@/components/ui/shuttle-route-overlay';
import {validateCampusRoute, getNearestCampus, type ValidationResult} from '@/services/maps/route-validator';
import {getCameraBoundsForRoute} from '@/services/maps/camera-utils';
import {useLiveLocation} from '@/hooks/use-live-location';
import {useStepNavigator, type ShuttlePhaseBoundaries} from '@/hooks/use-step-navigator';
import {StepByStepPanel} from '@/components/ui/step-by-step-panel';
import { useFocusEffect } from '@react-navigation/native';
import { consumeCompletedDestinationIndoorSession, consumeCompletedOriginIndoorSession } from '@/state/indoor-route-handoff';
import {POICategory,type POI} from "@/components/ui/POICategory";
import { OutdoorPOICard } from '@/components/ui/outdoor-poi-card';
import { DestinationPin } from '@/components/ui/destination-pin';
import { useGoogleCalendarEvents } from '@/hooks/use-google-calendar-events';
import { useNextClass } from '@/hooks/use-next-class';
import { parseLocationReference, type NextClassResult } from '@/services/next-class-parser';
import AccessibilityToggle from '@/components/indoor/accessibility-toggle';
import { useIndoorNavigationState } from '@/state/indoor-navigation-state';


const HONEYCOMB_IMAGE = require('@/assets/images/honeycomb.png');
const BEE_IMAGE = require('@/assets/images/bee.png');

function buildPolygonFeatures(points: ReturnType<typeof useNavigationController>['points'], userLocation: [number, number] | null) {
    const polys = [];
    for (const point of points) {
        const loc = point.building.location as any;
        if (loc?.type === 'Polygon' && loc?.coordinates) {
            let coords = loc.coordinates;
            let depth = 0;
            let current = coords;
            while (Array.isArray(current)) {
                depth++;
                current = current[0];
            }
            if (depth === 4) {
                coords = coords[0];
            } else if (depth === 2) {
                coords = [coords];
            }
            const inUserBuilding = userLocation
                ? PolygonUtils.isPointInPolygon(userLocation, coords as [number, number][][])
                : false;
            polys.push({
                type: 'Feature' as const,
                id: point.id,
                geometry: { type: 'Polygon' as const, coordinates: coords },
                properties: {
                    id: point.id,
                    name: point.building.name,
                    code: point.building.code,
                    campus: point.building.campus,
                    addresses: point.building.addresses,
                    isUserBuilding: inUserBuilding,
                    center: point.building.center,
                    hasIndoorMap: point.building.hasIndoorMap,
                },
            });
        }
    }
    return polys;
}

type BuildingOpeningHours = {
    weekdayDescription?: string[];
    weekdayDescriptions?: string[];
};

type BuildingDetails = {
    nationalPhoneNumber?: string;
    websiteUri?: string;
    regularOpeningHours?: BuildingOpeningHours;
};

type SelectedBuilding = {
    code?: string;
    campus?: string;
    name?: string;
    addresses?: string[];
    coordinates?: Coordinates;
    phone?: string;
    website?: string;
    hours?: string;
    allHours?: string[];
    hasIndoorMap?: boolean;
} & Record<string, unknown>;

type ClassroomDestination = {
    buildingCode: string;
    nodeId: string;
};

type ClassroomOrigin = {
    buildingCode: string;
    nodeId: string;
};

const ENTRANCE_PROXIMITY_METERS = 20;

function getIndoorRouteEndpoints(steps: IndoorDirectionsResponse[]): { fromNodeId: string; toNodeId: string } | null {
    const firstNode = steps[0]?.nodes?.[0];
    const lastStep = steps.at(-1);
    const lastNode = lastStep?.nodes?.at(-1);
    if (!firstNode || !lastNode) return null;
    return { fromNodeId: firstNode.id, toNodeId: lastNode.id };
}

function getSelectedLocationLabel(mapLocation: MapLocation): string {
    if (mapLocation.kind === 'classroom') return mapLocation.name;
    return mapLocation.name + (mapLocation.address ? `, ${mapLocation.address}` : '');
}

function toClassroomLocation(mapLocation: MapLocation): ClassroomOrigin | null {
    if (mapLocation.kind !== 'classroom') return null;
    if (!mapLocation.buildingCode || !mapLocation.floorId || !mapLocation.indoorNodeId) return null;

    return {
        buildingCode: mapLocation.buildingCode,
        nodeId: mapLocation.indoorNodeId,
    };
}

const toClassroomDestination = toClassroomLocation;
const toClassroomOrigin = toClassroomLocation;

function getStraightLineDistance(start: Coordinates, end: Coordinates): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRadians(end[1] - start[1]);
    const dLon = toRadians(end[0] - start[0]);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(start[1])) * Math.cos(toRadians(end[1])) * Math.sin(dLon / 2) ** 2;

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function areCoordinatesEqual(left: Coordinates | null, right: Coordinates | null): boolean {
    if (!left || !right) return left === right;
    return left[0] === right[0] && left[1] === right[1];
}

function pickClosestEntrance(entrances: IndoorNodeResponse[], target: Coordinates | null): IndoorNodeResponse | null {
    if (entrances.length === 0) return null;
    if (!target) return entrances[0];

    return entrances.reduce((closest, candidate) => {
        const closestDistance = getStraightLineDistance([closest.longitude, closest.latitude], target);
        const candidateDistance = getStraightLineDistance([candidate.longitude, candidate.latitude], target);
        return candidateDistance < closestDistance ? candidate : closest;
    }, entrances[0]);
}

function buildIndoorSummary(steps: IndoorDirectionsResponse[] | null): DirectionsResponse {
    const distanceMeters = Math.round((steps ?? []).reduce((total, step) => total + step.distance, 0));
    return {
        distanceMeters,
        durationSeconds: Math.round(distanceMeters / 1.35),
        polyline: '',
        steps: [],
    };
}

type ResolvedNextClassDestination = {
    buildingName: string;
    campus: string;
    coordinates: Coordinates;
    eventId: string;
    eventSummary: string;
    roomCode: string;
};

function getBuildingCodeFromRoomCode(roomCode: string): string {
    return roomCode.split('-')[0]?.toUpperCase() ?? '';
}

function getRoomNumberFromRoomCode(roomCode: string): string {
    return roomCode.split('-').slice(1).join('-').toUpperCase();
}

function normalizeIndoorNodeIdentifier(value: string): string {
    let normalized = '';

    for (const character of value.toUpperCase()) {
        const characterCode = character.codePointAt(0);
        if (characterCode === undefined) {
            continue;
        }
        const isAlphaNumeric =
            (characterCode >= 48 && characterCode <= 57) ||
            (characterCode >= 65 && characterCode <= 90);

        if (isAlphaNumeric) {
            normalized += character;
        }
    }

    return normalized;
}

function buildIndoorNodeIdCandidates(buildingCode: string, roomNumber: string): string[] {
    const normalizedBuildingCode = buildingCode.trim().toUpperCase();
    const normalizedRoomNumber = roomNumber.trim().toUpperCase();
    if (!normalizedBuildingCode || !normalizedRoomNumber) {
        return [];
    }

    const candidates = new Set<string>([
        `${normalizedBuildingCode}${normalizedRoomNumber}`,
    ]);

    if (!normalizedRoomNumber.includes('.') && normalizedRoomNumber.length > 0) {
        candidates.add(`${normalizedBuildingCode}${normalizedRoomNumber[0]}.${normalizedRoomNumber}`);
    }

    return [...candidates];
}

async function resolveIndoorRoomDestination(roomCode: string): Promise<(ClassroomDestination & { coordinates: Coordinates }) | null> {
    const buildingCode = getBuildingCodeFromRoomCode(roomCode);
    const roomNumber = getRoomNumberFromRoomCode(roomCode);
    if (!buildingCode || !roomNumber) {
        return null;
    }

    const candidateIds = new Set(
        buildIndoorNodeIdCandidates(buildingCode, roomNumber).map(normalizeIndoorNodeIdentifier)
    );
    if (candidateIds.size === 0) {
        return null;
    }

    const rooms = await fetchIndoorRooms(buildingCode);
    const matchedRoom = rooms.find((room) => candidateIds.has(normalizeIndoorNodeIdentifier(room.id)));
    if (!matchedRoom) {
        return null;
    }

    return {
        buildingCode,
        nodeId: matchedRoom.id,
        coordinates: [matchedRoom.longitude, matchedRoom.latitude],
    };
}

function normalizeBuildingName(value: string): string {
    let normalized = '';
    let inParentheses = false;
    let previousWasSpace = true;

    for (const character of value.toUpperCase()) {
        if (character === '(') {
            inParentheses = true;
            if (!previousWasSpace && normalized.length > 0) {
                normalized += ' ';
                previousWasSpace = true;
            }
            continue;
        }

        if (character === ')') {
            inParentheses = false;
            continue;
        }

        if (inParentheses) {
            continue;
        }

        const characterCode = character.codePointAt(0);
        if (characterCode === undefined) {
            continue;
        }
        const isAlphaNumeric =
            (characterCode >= 48 && characterCode <= 57) ||
            (characterCode >= 65 && characterCode <= 90);
        if (isAlphaNumeric) {
            normalized += character;
            previousWasSpace = false;
            continue;
        }

        if (!previousWasSpace && normalized.length > 0) {
            normalized += ' ';
            previousWasSpace = true;
        }
    }

    return normalized.trim();
}

function findBuildingPointByName(
    buildingName: string,
    points: ReturnType<typeof useNavigationController>['points']
): ReturnType<typeof useNavigationController>['points'][number] | undefined {
    const normalizedTarget = normalizeBuildingName(buildingName);

    return points.find((point) => {
        const normalizedCandidate = normalizeBuildingName(point.building.name);
        return (
            normalizedCandidate === normalizedTarget ||
            normalizedCandidate.includes(normalizedTarget) ||
            normalizedTarget.includes(normalizedCandidate)
        );
    });
}

function resolveNextClassDestination(
    nextClassResult: NextClassResult,
    points: ReturnType<typeof useNavigationController>['points']
): ResolvedNextClassDestination | null {
    if (nextClassResult.status === 'none') {
        return null;
    }

    const parsedLocation = nextClassResult.status === 'found'
        ? {
            buildingCode: getBuildingCodeFromRoomCode(nextClassResult.roomCode),
            buildingName: null,
            roomCode: nextClassResult.roomCode,
            roomNumber: nextClassResult.roomCode.split('-').slice(1).join('-') || null,
        }
        : parseLocationReference(nextClassResult.event.location);

    if (!parsedLocation?.roomNumber) {
        return null;
    }

    let matchingPoint: ReturnType<typeof useNavigationController>['points'][number] | undefined;
    if (parsedLocation.buildingCode) {
        matchingPoint = points.find(
            (point) => point.building.code.toUpperCase() === parsedLocation.buildingCode
        );
    } else if (parsedLocation.buildingName) {
        matchingPoint = findBuildingPointByName(parsedLocation.buildingName, points);
    }

    if (!matchingPoint) {
        return null;
    }

    const roomCode = parsedLocation.roomCode ?? `${matchingPoint.building.code.toUpperCase()}-${parsedLocation.roomNumber}`;

    return {
        buildingName: matchingPoint.building.name,
        campus: matchingPoint.building.campus,
        coordinates: matchingPoint.building.center,
        eventId: nextClassResult.event.id,
        eventSummary: nextClassResult.event.summary ?? 'Your next class',
        roomCode,
    };
}

// ─── NavigationOverlay ────────────────────────────────────────────────────────
// Extracted as its own component so hooks (useLiveLocation, useStepNavigator)
// are called unconditionally and can be safely mounted/unmounted.
type NavigationOverlayProps = {
    steps: Step[];
    totalDurationSeconds: number;
    cameraRef: React.RefObject<MapboxGL.Camera | null>;
    origin: { longitude: number; latitude: number };
    destination: { longitude: number; latitude: number };
    transportMode: TransportMode;
    provider: Provider;
    followLiveLocation: boolean;
    /**
     * When provided, the overlay is in shuttle mode.
     * Off-route detection is suppressed only during the shuttle-ride segment;
     * the walk legs retain full detection.
     */
    shuttlePhaseBoundaries?: ShuttlePhaseBoundaries;
    /** Called automatically when arrival is detected — for side-effects like indoor handoff. */
    onArrivedAuto?: () => void;
    /**
     * When provided, arrival at a building with an indoor leg shows "Enter Building"
     * instead of "End Navigation". Called when the user taps the button.
     */
    onIndoorHandoff?: () => void;
    /** Called when the user explicitly presses the End Navigation button. */
    onArrived?: () => void;
    onRecalculated: (newDirections: DirectionsResponse) => void;
    onExit: () => void;
};

function NavigationOverlay({
    steps,
    totalDurationSeconds,
    cameraRef,
    origin,
    destination,
    transportMode,
    provider,
    followLiveLocation,
    shuttlePhaseBoundaries,
    onArrivedAuto,
    onIndoorHandoff,
    onArrived,
    onRecalculated,
    onExit,
}: Readonly<NavigationOverlayProps>) {
    const { location } = useLiveLocation(true);
    const effectiveLocation = followLiveLocation
        ? location
        : { longitude: origin.longitude, latitude: origin.latitude, heading: null, accuracy: null };
    const stepNav = useStepNavigator(steps, effectiveLocation, shuttlePhaseBoundaries);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const recalcInFlightRef = useRef(false);
    const initialLockDone = useRef(false);
    const arrivalHandledRef = useRef(false);

    // Stable refs so the recalc effect doesn't re-fire when callbacks change identity
    const onRecalculatedRef = useRef(onRecalculated);
    onRecalculatedRef.current = onRecalculated;
    const clearOffRouteRef = useRef(stepNav.clearOffRoute);
    clearOffRouteRef.current = stepNav.clearOffRoute;
    const destinationRef = useRef(destination);
    destinationRef.current = destination;

    // Camera follow
    useEffect(() => {
        if (!effectiveLocation) return;
        if (!initialLockDone.current) {
            initialLockDone.current = true;
            cameraRef.current?.setCamera({
                centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
                zoomLevel: 19,
                animationDuration: 800,
            });
            return;
        }
        cameraRef.current?.setCamera({
            centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
            animationDuration: 1000,
            animationMode: 'easeTo',
        });
    }, [effectiveLocation, cameraRef]);

    // Off-route recalculation — only fires when isOffRoute flips to true
    useEffect(() => {
        if (!followLiveLocation) return;
        if (!stepNav.isOffRoute) return;
        if (recalcInFlightRef.current) return;
        if (!location) {
            clearOffRouteRef.current();
            return;
        }

        recalcInFlightRef.current = true;
        setIsRecalculating(true);

        // Capture current location snapshot for the request
        const origin = { longitude: location.longitude, latitude: location.latitude };

        const request: DirectionsRequest = {
            origin,
            destination: destinationRef.current,
            transportMode,
            provider,
            timeFilter: new Date().toISOString(),
            timeFilterMode: 'depart',
        };

        getDirections(request)
            .then((newDirections) => {
                onRecalculatedRef.current(newDirections);
                clearOffRouteRef.current();
            })
            .catch((err) => {
                console.warn('[NavigationOverlay] Recalculation failed', err);
                clearOffRouteRef.current();
            })
            .finally(() => {
                setIsRecalculating(false);
                recalcInFlightRef.current = false;
            });
    // Only re-run when isOffRoute changes — everything else is accessed via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [followLiveLocation, stepNav.isOffRoute]);

    useEffect(() => {
        if (!stepNav.arrived) {
            arrivalHandledRef.current = false;
            return;
        }
        if (arrivalHandledRef.current) return;
        arrivalHandledRef.current = true;
        // When an indoor handoff is pending, the user drives the transition
        // explicitly via the "Enter Building" button — don't auto-fire here.
        if (!onIndoorHandoff) onArrivedAuto?.();
    }, [onArrivedAuto, onIndoorHandoff, stepNav.arrived]);

    return (
        <StepByStepPanel
            steps={steps}
            currentStep={stepNav.currentStep}
            nextStep={stepNav.nextStep}
            afterNextStep={stepNav.afterNextStep}
            currentStepIndex={stepNav.currentStepIndex}
            distanceToNextTurn={stepNav.distanceToNextTurn}
            totalDistanceRemaining={stepNav.totalDistanceRemaining}
            totalDurationSecondsRemaining={stepNav.totalDurationSecondsRemaining}
            arrived={stepNav.arrived}
            isRecalculating={isRecalculating}
            shuttlePhase={stepNav.shuttlePhase}
            onExit={() => { onExit(); stepNav.reset(); }}
            onArrived={() => { onArrived?.(); stepNav.reset(); }}
            onIndoorHandoff={onIndoorHandoff ? () => { onIndoorHandoff(); stepNav.reset(); } : undefined}
        />
    );
}

export default function MapScreen() {
    const router = useRouter();

    const {
        campus,
        campuses,
        setCampus,
        hydrated,
        points,
        campusMetaById,
        campusMeta,
        tokenAvailable,
        mapsAdapter,
        error,
    } = useNavigationController();
    const [poiClearTrigger, setPoiClearTrigger] = useState(0);
    const clearPOICategory = () => setPoiClearTrigger(t => t + 1);
    const colorScheme = useColorScheme();
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const {events: calendarEvents} = useGoogleCalendarEvents();
    const {result: nextClassResult} = useNextClass({events: calendarEvents});
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const [directions, setDirections] = useState<DirectionsResponse | null>(null);
    const [selectedMode, setSelectedMode] = useState<'Drive' | 'Walk' | 'Transit' | 'Shuttle'>('Drive');
    const [timeFilter, setTimeFilter] = useState(() => new Date().toISOString());
    const [timeFilterMode, setTimeFilterMode] = useState<'depart' | 'arrive'>('depart');
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
    const [poiMarkers, setPoiMarkers] = useState<POI[]>([]);
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [fromCoordinates, setFromCoordinates] = useState<Coordinates | null>(null);
    const [routeFromCoordinates, setRouteFromCoordinates] = useState<Coordinates | null>(null);
    const [toCoordinates, setToCoordinates] = useState<Coordinates | null>(null);
    const [routeToCoordinates, setRouteToCoordinates] = useState<Coordinates | null>(null);
    const [classroomOrigin, setClassroomOrigin] = useState<ClassroomOrigin | null>(null);
    const [classroomDestination, setClassroomDestination] = useState<ClassroomDestination | null>(null);
    const [originIndoorSteps, setOriginIndoorSteps] = useState<IndoorDirectionsResponse[] | null>(null);
    const [destinationIndoorSteps, setDestinationIndoorSteps] = useState<IndoorDirectionsResponse[] | null>(null);
    const [activeIndoorSegment, setActiveIndoorSegment] = useState<'origin' | 'destination' | null>(null);
    const [indoorBeeCoordinates, setIndoorBeeCoordinates] = useState<Coordinates | null>(null);
    const [pendingStartSegment, setPendingStartSegment] = useState<'origin' | null>(null);
    const fromCoordinatesIsUserLocation = useRef(false);
    const destinationIndoorHandoffDoneRef = useRef(false);
    const originIndoorSessionIdRef = useRef<string | null>(null);
    const destinationIndoorSessionIdRef = useRef<string | null>(null);
    const resumeOutdoorFromIndoorRef = useRef(false);
    const [seeDirectionBar, setSeeDirectionBar] = useState<boolean>(false);
    const [routeValidation, setRouteValidation] = useState<ValidationResult | null>(null);
    const [showValidationError, setShowValidationError] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigationOrigin, setNavigationOrigin] = useState<Coordinates | null>(null);
    const [navigationUsesLiveLocation, setNavigationUsesLiveLocation] = useState(false);
    const activeDestinationCoordinates = routeToCoordinates ?? toCoordinates;
    const destinationEntranceTarget = navigationOrigin ?? routeFromCoordinates ?? fromCoordinates;
    const [dismissedNextClassEventId, setDismissedNextClassEventId] = useState<string | null>(null);
    // Snapshotted at onStartPress — never mutated by live hook re-fetches during navigation.
    const [activeSteps, setActiveSteps] = useState<Step[]>([]);
    const [activeShuttlePhaseBoundaries, setActiveShuttlePhaseBoundaries] = useState<ShuttlePhaseBoundaries | undefined>(undefined);
    // Frozen shuttle route polylines and stop info for the overlay and shuttle card.
    const [activeShuttleLegs, setActiveShuttleLegs] = useState<{
        walkToStop: DirectionsResponse | null;
        shuttleLeg: DirectionsResponse | null;
        walkFromStop: DirectionsResponse | null;
        originStopName: string;
        destinationStopName: string;
        shuttleDurationSeconds: number;
    } | null>(null);
    const { accessible, setAccessible } = useIndoorNavigationState();
    const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
    const navigationBottomFrame = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const [selectedOutdoorPOI, setSelectedOutdoorPOI] = useState<POI | null>(null);
    const suppressNextCampusCameraSync = useRef(false);
    // Flips to true when the user manually pans/zooms; reset when route endpoints
    // change so the first auto-zoom for a brand-new route still fires.
    const userHasManuallyPanned = useRef(false);
    // Flips to true once the auto-zoom for the current route has fired.
    // onMapIdle only sets userHasManuallyPanned AFTER this is true, so that
    // programmatic camera moves during origin/destination selection don't
    // prematurely suppress the route auto-zoom.
    const routeAutoZoomDoneRef = useRef(false);

    const nextClassDestination = useMemo(() => {
        return resolveNextClassDestination(nextClassResult, points);
    }, [nextClassResult, points]);

    const activeNextClassEventId = nextClassResult.status === 'none'
        ? null
        : nextClassResult.event.id;

    useEffect(() => {
        if (!activeNextClassEventId) {
            setDismissedNextClassEventId(null);
            return;
        }

        if (dismissedNextClassEventId && dismissedNextClassEventId !== activeNextClassEventId) {
            setDismissedNextClassEventId(null);
        }
    }, [activeNextClassEventId, dismissedNextClassEventId]);

    function setStartingPointAsUserCoordinates() {
        setFrom('Your location');
        setFromCoordinates(userLocation);
        setRouteFromCoordinates(userLocation);
        setClassroomOrigin(null);
        setOriginIndoorSteps(null);
        fromCoordinatesIsUserLocation.current = true;
    }

    function clearOriginRouting() {
        setRouteFromCoordinates(null);
        setClassroomOrigin(null);
        setOriginIndoorSteps(null);
        setIndoorBeeCoordinates(null);
        userHasManuallyPanned.current = false;
        routeAutoZoomDoneRef.current = false;
    }

    function clearDestinationRouting() {
        setRouteToCoordinates(null);
        setClassroomDestination(null);
        setDestinationIndoorSteps(null);
        setIndoorBeeCoordinates(null);
        userHasManuallyPanned.current = false;
        routeAutoZoomDoneRef.current = false;
    }

    async function startDirectionsToNextClass() {
        if (!nextClassDestination) return;
        setStartingPointAsUserCoordinates();
        clearDestinationRouting();
        setTo(nextClassDestination.roomCode);
        setCampus(nextClassDestination.campus);
        setSeeDirectionBar(true);
        setDismissedNextClassEventId(nextClassDestination.eventId);
        setSelectedBuilding(null);
        cameraRef.current?.setCamera({
            centerCoordinate: nextClassDestination.coordinates,
            zoomLevel: 18,
            animationDuration: 800,
        });

        try {
            const indoorDestination = await resolveIndoorRoomDestination(nextClassDestination.roomCode);
            if (indoorDestination) {
                setClassroomDestination({
                    buildingCode: indoorDestination.buildingCode,
                    nodeId: indoorDestination.nodeId,
                });
                setToCoordinates(indoorDestination.coordinates);
                return;
            }
        } catch (error) {
            console.warn('Failed to resolve next class indoor room', error);
        }

        setToCoordinates(nextClassDestination.coordinates);
    }

    function navigateToSelectedBuilding() {
        if (!selectedBuilding) return;
        setStartingPointAsUserCoordinates();
        setTo(selectedBuilding.name + (!!selectedBuilding.addresses && selectedBuilding.addresses.length > 0 ? ', ' + selectedBuilding.addresses[0] : ''));
        if (selectedBuilding.coordinates) {
            setToCoordinates(selectedBuilding.coordinates);
            clearDestinationRouting();
            setRouteToCoordinates(selectedBuilding.coordinates);
            cameraRef.current?.setCamera({
                centerCoordinate: selectedBuilding.coordinates,
                zoomLevel: 18,
                animationDuration: 800,
            });
        }
        setSeeDirectionBar(true);
        setSelectedBuilding(null);
    }

    useEffect(() => {
        initializeDirectionsCache();
    }, []);

    useEffect(() => {
        const unsubscribe = addDirectionsListener((event) => {
            if (event.type === 'request-started' || event.type === 'request-failed') {
                setDirections(null);
            }
            if (event.type === 'request-timeout') {
                setDirections(null);
                setShowTimeoutModal(true);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        let active = true;

        async function resolveOriginIndoorLeg() {
            setOriginIndoorSteps(null);

            if (!classroomOrigin || !fromCoordinates) {
                setRouteFromCoordinates((current) => (areCoordinatesEqual(current, fromCoordinates) ? current : fromCoordinates));
                return;
            }

            try {
                const entrances = await fetchIndoorEntrances(classroomOrigin.buildingCode);
                const chosenEntrance = pickClosestEntrance(entrances, activeDestinationCoordinates);
                if (!active || !chosenEntrance) return;

                const entranceCoordinates: Coordinates = [chosenEntrance.longitude, chosenEntrance.latitude];
                setRouteFromCoordinates((current) => (areCoordinatesEqual(current, entranceCoordinates) ? current : entranceCoordinates));

                const indoorSteps = await fetchIndoorDirections(
                    classroomOrigin.buildingCode,
                    classroomOrigin.nodeId,
                    chosenEntrance.id,
                );
                if (!active) return;
                setOriginIndoorSteps(indoorSteps);
            } catch (error) {
                if (!active) return;
                console.warn('Failed to load indoor origin directions', error);
                setRouteFromCoordinates((current) => (areCoordinatesEqual(current, fromCoordinates) ? current : fromCoordinates));
            }
        }

        resolveOriginIndoorLeg();

        return () => {
            active = false;
        };
    }, [activeDestinationCoordinates, classroomOrigin, fromCoordinates]);

    useEffect(() => {
        let active = true;

        async function resolveDestinationIndoorLeg() {
            setDestinationIndoorSteps(null);

            if (!classroomDestination || !toCoordinates) {
                setRouteToCoordinates((current) => (areCoordinatesEqual(current, toCoordinates) ? current : toCoordinates));
                return;
            }

            try {
                const entrances = await fetchIndoorEntrances(classroomDestination.buildingCode);
                const chosenEntrance = pickClosestEntrance(entrances, destinationEntranceTarget);
                if (!active || !chosenEntrance) return;

                const entranceCoordinates: Coordinates = [chosenEntrance.longitude, chosenEntrance.latitude];
                setRouteToCoordinates((current) => (areCoordinatesEqual(current, entranceCoordinates) ? current : entranceCoordinates));

                const indoorSteps = await fetchIndoorDirections(
                    classroomDestination.buildingCode,
                    chosenEntrance.id,
                    classroomDestination.nodeId,
                );
                if (!active) return;
                setDestinationIndoorSteps(indoorSteps);
            } catch (error) {
                if (!active) return;
                console.warn('Failed to load indoor destination directions', error);
                setRouteToCoordinates((current) => (areCoordinatesEqual(current, toCoordinates) ? current : toCoordinates));
            }
        }

        resolveDestinationIndoorLeg();

        return () => {
            active = false;
        };
    }, [classroomDestination, destinationEntranceTarget, toCoordinates]);

    useEffect(() => {
        let indoorSteps: typeof originIndoorSteps | null = null;
        if (activeIndoorSegment === 'origin') indoorSteps = originIndoorSteps;
        else if (activeIndoorSegment === 'destination') indoorSteps = destinationIndoorSteps;
        const firstNode = indoorSteps?.[0]?.nodes?.[0];
        if (!cameraRef.current || !firstNode) return;

        cameraRef.current.setCamera({
            centerCoordinate: [firstNode.longitude, firstNode.latitude],
            zoomLevel: 20,
            animationDuration: 800,
        });
    }, [activeIndoorSegment, destinationIndoorSteps, originIndoorSteps]);

    const isSameCampusRoute = useMemo(() => {
        if (!routeFromCoordinates || !routeToCoordinates) return false;
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: routeFromCoordinates[0], latitude: routeFromCoordinates[1]},
            destination: {type: 'coordinate', longitude: routeToCoordinates[0], latitude: routeToCoordinates[1]},
        }, campusMetaById);
        return !result.valid || !result.route.isInterCampus;
    }, [routeFromCoordinates, routeToCoordinates, campusMetaById]);

    const shouldStartDestinationIndoorOnly = useMemo(() => {
        if (!fromCoordinatesIsUserLocation.current) return false;
        if (!classroomDestination || !fromCoordinates || !routeToCoordinates) return false;
        return getStraightLineDistance(fromCoordinates, routeToCoordinates) <= ENTRANCE_PROXIMITY_METERS;
    }, [classroomDestination, fromCoordinates, routeToCoordinates]);

    const showRouteOverview = useMemo(() => {
        if (isNavigating || activeIndoorSegment) return false;
        if (!routeFromCoordinates || !routeToCoordinates) return false;
        return Boolean(directions) || shouldStartDestinationIndoorOnly;
    }, [activeIndoorSegment, directions, isNavigating, routeFromCoordinates, routeToCoordinates, shouldStartDestinationIndoorOnly]);

    const showOutdoorConnectors = useMemo(() => {
        if (selectedMode !== 'Drive' || activeIndoorSegment) return false;
        return Boolean(directions) && (showRouteOverview || isNavigating);
    }, [activeIndoorSegment, directions, isNavigating, selectedMode, showRouteOverview]);

    const originOutdoorConnector = useMemo(() => {
        if (!showOutdoorConnectors || !directions) return null;
        const originIndoorEndNode = originIndoorSteps?.at(-1)?.nodes?.at(-1);
        if (!originIndoorEndNode) return null;
        const originIndoorEndCoordinates: Coordinates = [originIndoorEndNode.longitude, originIndoorEndNode.latitude];
        const outdoorStartStep = directions.steps[0];
        if (!outdoorStartStep) return null;
        const outdoorStartCoordinates: Coordinates = [outdoorStartStep.startLocation.longitude, outdoorStartStep.startLocation.latitude];
        if (areCoordinatesEqual(originIndoorEndCoordinates, outdoorStartCoordinates)) return null;
        return [originIndoorEndCoordinates, outdoorStartCoordinates] as Coordinates[];
    }, [directions, originIndoorSteps, showOutdoorConnectors]);

    const destinationOutdoorConnector = useMemo(() => {
        if (!showOutdoorConnectors || !directions) return null;
        const destinationIndoorStartNode = destinationIndoorSteps?.[0]?.nodes?.[0];
        if (!destinationIndoorStartNode) return null;
        const destinationIndoorStartCoordinates: Coordinates = [destinationIndoorStartNode.longitude, destinationIndoorStartNode.latitude];
        const outdoorEndStep = directions.steps[directions.steps.length - 1];
        if (!outdoorEndStep) return null;
        const outdoorEndCoordinates: Coordinates = [outdoorEndStep.endLocation.longitude, outdoorEndStep.endLocation.latitude];
        if (areCoordinatesEqual(outdoorEndCoordinates, destinationIndoorStartCoordinates)) return null;
        return [outdoorEndCoordinates, destinationIndoorStartCoordinates] as Coordinates[];
    }, [destinationIndoorSteps, directions, showOutdoorConnectors]);

    const shuttleOrigin = useMemo(
        () => routeFromCoordinates ? {longitude: routeFromCoordinates[0], latitude: routeFromCoordinates[1]} : null,
        [routeFromCoordinates],
    );
    const shuttleDestination = useMemo(
        () => routeToCoordinates ? {longitude: routeToCoordinates[0], latitude: routeToCoordinates[1]} : null,
        [routeToCoordinates],
    );
    const shuttleRouting = useShuttleRouting({
        enabled: selectedMode === 'Shuttle' && !isSameCampusRoute && !isNavigating,
        origin: shuttleOrigin,
        destination: shuttleDestination,
        timeFilter,
        timeFilterMode,
    });

    // 2.4.2 — Validate campus-to-campus route when both endpoints are set
    useEffect(() => {
        if (!routeFromCoordinates || !routeToCoordinates) {
            setRouteValidation(null);
            return;
        }
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: routeFromCoordinates[0], latitude: routeFromCoordinates[1]},
            destination: {type: 'coordinate', longitude: routeToCoordinates[0], latitude: routeToCoordinates[1]},
        }, campusMetaById);
        setRouteValidation(result);
        setPoiMarkers([]);
        // Never show the validation error modal while actively navigating —
        // recalculation uses the live GPS position which may be off-campus.
        if (!result.valid && !isNavigating && !activeIndoorSegment && !shouldStartDestinationIndoorOnly) {
            setShowValidationError(true);
            setDirections(null);
        }
    }, [activeIndoorSegment, campusMetaById, isNavigating, routeFromCoordinates, routeToCoordinates, shouldStartDestinationIndoorOnly]);

    // 2.4.3 — Auto-zoom camera for inter-campus routes when directions first arrive.
    // Skipped if the user has manually panned/zoomed since the last endpoint change.
    useEffect(() => {
        if (!directions || !routeValidation?.valid || isNavigating) return;
        if (userHasManuallyPanned.current) return;
        const {route} = routeValidation;
        const bounds = getCameraBoundsForRoute(route.originCampus, route.destinationCampus, campusMetaById);
        if (bounds.bounds) {
            cameraRef.current?.setCamera({
                bounds: {ne: bounds.bounds.ne, sw: bounds.bounds.sw, paddingLeft: 40, paddingRight: 40, paddingTop: 120, paddingBottom: 120},
                animationDuration: bounds.animationDuration,
            });
        } else {
            cameraRef.current?.setCamera({
                centerCoordinate: bounds.centerCoordinate,
                zoomLevel: bounds.zoomLevel,
                animationDuration: bounds.animationDuration,
            });
        }
        routeAutoZoomDoneRef.current = true;
    }, [campusMetaById, directions, routeValidation]);

    useEffect(() => {
        if (!campusMeta) return;
        if (suppressNextCampusCameraSync.current) {
            suppressNextCampusCameraSync.current = false;
            return;
        }
        cameraRef.current?.setCamera({
            centerCoordinate: campusMeta.center,
            zoomLevel: campusMeta.zoom,
            animationDuration: 800,
        });
    }, [campusMeta]);


    const SEARCH_FOCUS_ZOOM = 18;
    const focusCamera = (coordinates: [number, number] | null) => {
        if (!cameraRef.current || !coordinates) return;
        cameraRef.current.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: SEARCH_FOCUS_ZOOM,
            animationDuration: 800,
        });
    };

    useEffect(() => {
        let active = true;
        const ensureAndroidPermissions = async () => {
            if (Platform.OS !== 'android' || typeof MapboxGL.requestAndroidLocationPermissions !== 'function') return;
            try {
                const granted = await MapboxGL.requestAndroidLocationPermissions();
                if (!active) return;
                if (granted) {
                    setLocationPermissionStatus('granted');
                } else {
                    setLocationPermissionStatus('denied');
                    setShowLocationPrompt(true);
                }
            } catch {
                if (!active) return;
                setLocationPermissionStatus('denied');
                setShowLocationPrompt(true);
            }
        };
        ensureAndroidPermissions();
        return () => {
            active = false;
        };
    }, []);

    const theme = Colors[colorScheme ?? 'light'];
    const shouldShowNextClassPrompt = Boolean(
        !isNavigating &&
        !seeDirectionBar &&
        nextClassDestination &&
        dismissedNextClassEventId !== nextClassDestination.eventId
    );
    const shouldShowNoLocationStatus = Boolean(
        !isNavigating &&
        !seeDirectionBar &&
        nextClassResult.status === 'no_location' &&
        !nextClassDestination &&
        dismissedNextClassEventId !== nextClassResult.event.id
    );
    const nextClassPromptBody = nextClassDestination
        ? `Navigate to ${nextClassDestination.eventSummary}. Your next class is in Room ${nextClassDestination.roomCode}, ${nextClassDestination.buildingName}.`
        : null;
    const nextClassNoLocationBody = nextClassResult.status === 'no_location'
        ? `We couldn't find a room in ${nextClassResult.event.summary ?? 'your next class'}. Update the event location to continue.`
        : null;

  // --- FEATURE BUILDER ---
  const polygonFeatures = useMemo(() => buildPolygonFeatures(points, userLocation), [points, userLocation]);

    const shapeCollection = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: polygonFeatures,
    }), [polygonFeatures]);

    const beeCoordinates = useMemo(() => {
        if (indoorBeeCoordinates) return indoorBeeCoordinates;
        if (isNavigating && navigationOrigin && !navigationUsesLiveLocation) return navigationOrigin;
        if (seeDirectionBar && fromCoordinates && !fromCoordinatesIsUserLocation.current) return fromCoordinates;
        return userLocation;
    }, [fromCoordinates, indoorBeeCoordinates, isNavigating, navigationOrigin, navigationUsesLiveLocation, seeDirectionBar, userLocation]);

    const userLocationShape = useMemo(() => {
        if (!beeCoordinates) return null;
        return {
            type: 'FeatureCollection' as const,
            features: [
                {
                    type: 'Feature' as const,
                    id: 'user-location',
                    geometry: {type: 'Point' as const, coordinates: beeCoordinates},
                    properties: {},
                },
            ],
        };
    }, [beeCoordinates]);

    let transportMode: TransportMode = TransportMode.WALKING;
    if (selectedMode === 'Drive') transportMode = TransportMode.DRIVING;
    else if (selectedMode === 'Transit') transportMode = TransportMode.TRANSIT;

    const beginOutdoorNavigation = useCallback(() => {
        const isShuttleMode = selectedMode === 'Shuttle';
        const walkToSteps = shuttleRouting.walkToStop?.steps ?? [];
        const rawShuttleSteps = shuttleRouting.shuttleLeg?.steps ?? [];
        const walkFromSteps = shuttleRouting.walkFromStop?.steps ?? [];
        const originName = shuttleRouting.stopsForTrip?.originStop?.name ?? 'Shuttle Stop';
        const destName = shuttleRouting.stopsForTrip?.destinationStop?.name ?? 'Shuttle Stop';
        const destStopCoord = shuttleRouting.stopsForTrip?.destinationStop?.coordinate;
        const originStopCoord = shuttleRouting.stopsForTrip?.originStop?.coordinate;
        const totalShuttleDist = rawShuttleSteps.reduce((s, st) => s + st.distance, 0);
        const totalShuttleDur = rawShuttleSteps.reduce((s, st) => s + st.duration, 0);
        const shuttleSteps = rawShuttleSteps.length > 0 ? [{
            distance: totalShuttleDist,
            duration: totalShuttleDur,
            instruction: 'Ride the Concordia Shuttle',
            maneuver: 'depart',
            startLocation: originStopCoord ?? rawShuttleSteps[0].startLocation,
            endLocation: destStopCoord ?? rawShuttleSteps[rawShuttleSteps.length - 1].endLocation,
            polyline: undefined,
            transitDetails: {
                transitLine: {
                    name: 'Concordia Shuttle',
                    nameShort: 'Shuttle',
                    color: '#e5a712',
                },
                stopDetails: {
                    departureStop: { name: originName },
                    arrivalStop:   { name: destName },
                },
            },
        }] : [];
        const steps = isShuttleMode
            ? [...walkToSteps, ...shuttleSteps, ...walkFromSteps]
            : (directions?.steps ?? []);

        setIndoorBeeCoordinates(null);
        destinationIndoorHandoffDoneRef.current = false;
        setNavigationOrigin(routeFromCoordinates ?? fromCoordinates);
        setNavigationUsesLiveLocation(fromCoordinatesIsUserLocation.current || activeIndoorSegment === 'origin' || resumeOutdoorFromIndoorRef.current);
        resumeOutdoorFromIndoorRef.current = false;
        setActiveSteps(steps);
        setActiveShuttlePhaseBoundaries(
            isShuttleMode
                ? { walkToStopCount: walkToSteps.length, shuttleLegCount: shuttleSteps.length }
                : undefined
        );
        setActiveShuttleLegs(
            isShuttleMode
                ? {
                    walkToStop: shuttleRouting.walkToStop,
                    shuttleLeg: shuttleRouting.shuttleLeg,
                    walkFromStop: shuttleRouting.walkFromStop,
                    originStopName: shuttleRouting.stopsForTrip?.originStop?.name ?? 'Shuttle Stop',
                    destinationStopName: shuttleRouting.stopsForTrip?.destinationStop?.name ?? 'Shuttle Stop',
                    shuttleDurationSeconds: shuttleRouting.shuttleLeg?.durationSeconds ?? 0,
                  }
                : null
        );
        setIsNavigating(true);
    }, [activeIndoorSegment, directions, fromCoordinates, routeFromCoordinates, selectedMode, shuttleRouting]);

    // LB's entrance/exit is on LB1, but the lowest mapped floor is LB2.
    // When crossing the LB building boundary in either direction, we inject
    // a `stairsNotice` query param so the indoor screen can render an
    // artificial step reminding the user to use the stairs/elevator.
    // Pure LB→LB routes do not get the notice.
    const needsLbStairsNotice = useCallback(
        (segment: 'origin' | 'destination') => {
            const originIsLB = classroomOrigin?.buildingCode === 'LB';
            const destinationIsLB = classroomDestination?.buildingCode === 'LB';
            if (originIsLB && destinationIsLB) return false; // LB→LB, no notice
            if (segment === 'origin') return originIsLB;      // LB→outside
            return destinationIsLB;                           // outside→LB
        },
        [classroomDestination?.buildingCode, classroomOrigin?.buildingCode],
    );

    const openOriginIndoorMap = useCallback(() => {
        if (!classroomOrigin || !originIndoorSteps) return;
        const endpoints = getIndoorRouteEndpoints(originIndoorSteps);
        if (!endpoints) return;

        const startFloor = originIndoorSteps[0]?.nodes?.[0]?.floor;
        const campusId = campusMeta?.id;
        const campusQuery = campusId ? `&campus=${encodeURIComponent(campusId)}` : '';
        let floorQuery = '';
        if (startFloor) floorQuery = `?floor=${encodeURIComponent(startFloor)}${campusQuery}`;
        else if (campusId) floorQuery = `?campus=${encodeURIComponent(campusId)}`;
        const fromLabel = encodeURIComponent(from);
        const toLabel = encodeURIComponent('Building exit');
        const sessionId = `${Date.now()}`;
        const stairsParam = needsLbStairsNotice('origin') ? '&stairsNotice=exit' : '';

        originIndoorSessionIdRef.current = sessionId;
        setIndoorBeeCoordinates(null);
        setSeeDirectionBar(false);

        router.push(
            `/indoor/${encodeURIComponent(classroomOrigin.buildingCode)}${floorQuery}${floorQuery ? '&' : '?'}fromNode=${encodeURIComponent(endpoints.fromNodeId)}&toNode=${encodeURIComponent(endpoints.toNodeId)}&fromLabel=${fromLabel}&toLabel=${toLabel}&resumeSession=${encodeURIComponent(sessionId)}${stairsParam}` as Href
        );
    }, [campusMeta, classroomOrigin, from, needsLbStairsNotice, originIndoorSteps, router]);

    const openDestinationIndoorMap = useCallback(() => {
        if (!classroomDestination || !destinationIndoorSteps) return;
        const endpoints = getIndoorRouteEndpoints(destinationIndoorSteps);
        if (!endpoints) return;

        const startFloor = destinationIndoorSteps[0]?.nodes?.[0]?.floor;
        const campusId = campusMeta?.id;
        const campusQuery = campusId ? `&campus=${encodeURIComponent(campusId)}` : '';
        let floorQuery = '';
        if (startFloor) floorQuery = `?floor=${encodeURIComponent(startFloor)}${campusQuery}`;
        else if (campusId) floorQuery = `?campus=${encodeURIComponent(campusId)}`;
        const fromLabel = encodeURIComponent('Building entrance');
        const toLabel = encodeURIComponent(to);
        const sessionId = `${Date.now()}`;
        const stairsParam = needsLbStairsNotice('destination') ? '&stairsNotice=entrance' : '';

        setActiveIndoorSegment(null);
        setIsNavigating(false);
        setIndoorBeeCoordinates(null);
        setSeeDirectionBar(false);
        destinationIndoorSessionIdRef.current = sessionId;

        router.push(
            `/indoor/${encodeURIComponent(classroomDestination.buildingCode)}${floorQuery}${floorQuery ? '&' : '?'}fromNode=${encodeURIComponent(endpoints.fromNodeId)}&toNode=${encodeURIComponent(endpoints.toNodeId)}&fromLabel=${fromLabel}&toLabel=${toLabel}&completeSession=${encodeURIComponent(sessionId)}${stairsParam}` as Href
        );
    }, [campusMeta, classroomDestination, destinationIndoorSteps, needsLbStairsNotice, router, to]);

    useEffect(() => {
        if (pendingStartSegment !== 'origin') return;
        if (!originIndoorSteps) return;

        setPendingStartSegment(null);
        openOriginIndoorMap();
    }, [openOriginIndoorMap, originIndoorSteps, pendingStartSegment]);

    const handleStartPress = useCallback(() => {
        const isShuttleMode = selectedMode === 'Shuttle';
        if (shouldStartDestinationIndoorOnly) {
            if (!destinationIndoorSteps) return;
            openDestinationIndoorMap();
            return;
        }
        if (classroomOrigin && originIndoorSteps) {
            openOriginIndoorMap();
            return;
        }
        if (classroomOrigin) {
            setPendingStartSegment('origin');
            return;
        }
        if (!isShuttleMode && !directions) return;

        beginOutdoorNavigation();
    }, [beginOutdoorNavigation, classroomOrigin, destinationIndoorSteps, directions, openDestinationIndoorMap, openOriginIndoorMap, originIndoorSteps, selectedMode, shouldStartDestinationIndoorOnly]);

    useFocusEffect(
        useCallback(() => {
            if (!consumeCompletedOriginIndoorSession(originIndoorSessionIdRef.current)) return undefined;
            resumeOutdoorFromIndoorRef.current = true;
            beginOutdoorNavigation();
            originIndoorSessionIdRef.current = null;
            return undefined;
        }, [beginOutdoorNavigation]),
    );

    const handleNavigationExit = useCallback(() => {
        setIsNavigating(false);
        if (activeDestinationCoordinates) {
            const nearest = getNearestCampus(activeDestinationCoordinates[0], activeDestinationCoordinates[1], campusMetaById);
            if (nearest) setCampus(nearest);
        }
        setSeeDirectionBar(true);
        setFrom(to);
        setFromCoordinates(toCoordinates);
        setRouteFromCoordinates(toCoordinates);
        setIndoorBeeCoordinates(toCoordinates);
        setClassroomOrigin(classroomDestination);
        setOriginIndoorSteps(null);
        fromCoordinatesIsUserLocation.current = false;
        setTo('');
        setToCoordinates(null);
        clearDestinationRouting();
        setDirections(null);
        setNavigationOrigin(null);
        setNavigationUsesLiveLocation(false);
        setPendingStartSegment(null);
        destinationIndoorHandoffDoneRef.current = false;
        setActiveSteps([]);
        setActiveShuttlePhaseBoundaries(undefined);
        setActiveShuttleLegs(null);
    }, [activeDestinationCoordinates, campusMetaById, classroomDestination, setCampus, to, toCoordinates]);

    // Mid-route "End" — stop navigating but restore the pre-filled search state
    // so the user lands back on the NavigationBottom with their origin/destination intact.
    useFocusEffect(
        useCallback(() => {
            if (!consumeCompletedDestinationIndoorSession(destinationIndoorSessionIdRef.current)) return undefined;
            destinationIndoorSessionIdRef.current = null;
            handleNavigationExit();
            return undefined;
        }, [handleNavigationExit]),
    );

    const handleNavigationExitMidRoute = useCallback(() => {
        setIsNavigating(false);
        if (toCoordinates) {
            const nearest = getNearestCampus(toCoordinates[0], toCoordinates[1], campusMetaById);
            if (nearest) setCampus(nearest);
        }
        setSeeDirectionBar(true);
        setActiveSteps([]);
        setActiveShuttlePhaseBoundaries(undefined);
        setActiveShuttleLegs(null);
        // from, fromCoordinates, to, toCoordinates, directions — intentionally preserved
    }, [toCoordinates, campusMetaById, setCampus]);

    const handleBuildingPress = useCallback((e: Parameters<NonNullable<import('react').ComponentProps<typeof MapboxGL.ShapeSource>['onPress']>>[0]) => {
        if (isNavigating) return;
        const tapPoint = (e as { point?: { x?: number; y?: number } }).point;
        const blockingFrame = navigationBottomFrame.current;
        if (
            tapPoint?.x != null &&
            tapPoint?.y != null &&
            blockingFrame &&
            tapPoint.x >= blockingFrame.x &&
            tapPoint.x <= blockingFrame.x + blockingFrame.width &&
            tapPoint.y >= blockingFrame.y &&
            tapPoint.y <= blockingFrame.y + blockingFrame.height
        ) {
            return;
        }
        const f = e.features[0];
        const point = points.find(p => p.id === f.properties?.id);
        const details = point?.details as BuildingDetails | undefined;
        const day = new Date().getDay();
        setSelectedBuilding({
            ...f.properties,
            phone: details?.nationalPhoneNumber,
            website: details?.websiteUri,
            hours: details?.regularOpeningHours?.weekdayDescription?.[day === 0 ? 6 : day - 1]
                ?? 'Hours not listed',
            allHours: details?.regularOpeningHours?.weekdayDescriptions,
            coordinates: f.properties?.center as Coordinates | undefined,
            // Read directly from point — Mapbox serialises feature properties to
            // JSON on press, which can corrupt booleans to strings or drop them.
            hasIndoorMap: !!point?.building?.hasIndoorMap,
        });
    }, [isNavigating, points]);

    const handleNavigationBottomLayout = useCallback((event: LayoutChangeEvent) => {
        navigationBottomFrame.current = event.nativeEvent.layout;
    }, []);

    const handleMapIdle = useCallback((event: any) => {
        if (isNavigating) return;

        const center =
            event?.properties?.center ??
            event?.geometry?.coordinates ??
            event?.centerCoordinate;

        if (!Array.isArray(center) || center.length < 2) {
            return;
        }

        // Only count this as a manual pan if the route auto-zoom has already fired.
        // This prevents programmatic focusCamera() calls during origin/destination
        // selection from prematurely suppressing the first route auto-zoom.
        if (!suppressNextCampusCameraSync.current && routeAutoZoomDoneRef.current) {
            userHasManuallyPanned.current = true;
        }

        const nearest = getNearestCampus(center[0], center[1], campusMetaById);
        if (!nearest || nearest === campus) {
            return;
        }

        suppressNextCampusCameraSync.current = true;
        setCampus(nearest);
    }, [campus, campusMetaById, isNavigating, setCampus]);

    if (!tokenAvailable) return <ThemedView style={styles.centered}><ThemedText>No Token</ThemedText></ThemedView>;
    if (error) return <ThemedView style={styles.centered}><ThemedText>{error}</ThemedText></ThemedView>;
    if (!hydrated || !campusMeta) return <ThemedView style={styles.centered}><ActivityIndicator/></ThemedView>;

    return (
        <ThemedView style={styles.container}>
            <MapboxGL.MapView
                styleURL={mapsAdapter.defaultStyleURL}
                style={StyleSheet.absoluteFill}
                logoEnabled={false}
                scaleBarEnabled={false}
                onMapIdle={handleMapIdle}
            >
                <MapboxGL.Camera
                    ref={cameraRef}
                    centerCoordinate={campusMeta.center}
                    zoomLevel={campusMeta.zoom}
                />
                <MapboxGL.UserLocation
                    visible={false}
                    onUpdate={(loc: any) => {
                        const coords = loc?.coords;
                        if (!coords) return;
                        const newLocation: [number, number] = [coords.longitude, coords.latitude];

                        setUserLocation(newLocation);

                        if (fromCoordinatesIsUserLocation.current) {
                            setFromCoordinates(newLocation);
                        }

                        setLocationPermissionStatus('granted');
                        setShowLocationPrompt(false);
                    }}
                />

                <MapboxGL.Images
                    images={{
                        honeycomb: {
                            uri: Image.resolveAssetSource(HONEYCOMB_IMAGE).uri,
                            scale: 10
                        },
                        bee: {
                            uri: Image.resolveAssetSource(BEE_IMAGE).uri,
                            scale: 1,
                        },
                    }}
                />

                {userLocationShape && (
                    <MapboxGL.ShapeSource id="user-location-source" shape={userLocationShape}>
                        <MapboxGL.SymbolLayer
                            id="user-location-icon"
                            style={{
                                iconImage: 'bee',
                                iconSize: 0.25,
                                iconAllowOverlap: true,
                                iconAnchor: 'center',
                            }}
                        />
                    </MapboxGL.ShapeSource>
                )}

        {polygonFeatures.length > 0 && (
          <MapboxGL.ShapeSource
            id="campus-buildings-source"
            shape={shapeCollection}
            onPress={handleBuildingPress}
          >
            {/* LAYER A: Burgundy Background */}
            <MapboxGL.FillLayer
              id="campus-buildings-base"
              aboveLayerID="road-label"
              style={{
                fillColor: '#9d1e30',
                fillOpacity: 0.78,
              }}
            />

                        {/* LAYER B: The Honeycomb Pattern */}
                        <MapboxGL.FillLayer
                            id="campus-buildings-pattern"
                            aboveLayerID="campus-buildings-base"
                            style={{
                                fillPattern: 'honeycomb',
                                fillOpacity: 1,
                            }}
                        />

                        {/* LAYER B2: User's current building highlight */}
                        <MapboxGL.FillLayer
                            id="user-building-highlight"
                            aboveLayerID="campus-buildings-pattern"
                            filter={['==', ['get', 'isUserBuilding'], true]}
                            style={{
                                fillColor: '#F8D7DD',
                                fillOpacity: 0.42,
                            }}
                        />

                        {/* LAYER C: Outline */}
                        <MapboxGL.LineLayer
                            id="campus-buildings-outline"
                            aboveLayerID="campus-buildings-pattern"
                            style={{
                                lineColor: '#6F1120',
                                lineWidth: 2.2,
                            }}
                        />
                    </MapboxGL.ShapeSource>
                )}
                {toCoordinates &&
                    <MapboxGL.PointAnnotation
                        key='toPoint'
                        id='toPoint'
                        coordinate={toCoordinates}
                    >
                        <DestinationPin />
                    </MapboxGL.PointAnnotation>
                }

                {poiMarkers.length > 0 && poiMarkers.map((poi, index) => (
                    <MapboxGL.PointAnnotation
                        key={`poi-${poi.name}-${index}`}
                        id={`poi-${poi.name}-${index}`}
                        coordinate={[poi.coordinates.longitude, poi.coordinates.latitude]}
                        onSelected={() => setSelectedOutdoorPOI(poi)}
                    >
                        <View style={styles.poiMarker}>
                            <Text style={styles.poiMarkerText}>📍</Text>
                        </View>
                    </MapboxGL.PointAnnotation>
                ))}
                {directions && selectedMode !== 'Shuttle' && !activeIndoorSegment && (
                    <DirectionsLine
                        directions={directions}
                        infoCardPosition="top"
                        showStartEndpoint={true}
                        showEndEndpoint={false}
                    />
                )}
                {originIndoorSteps && (activeIndoorSegment === 'origin' || showRouteOverview) && (
                    <DirectionsLine
                        directions={buildIndoorSummary(originIndoorSteps)}
                        sourceId="origin-indoor-source"
                        layerId="origin-indoor-layer"
                        endpointId="origin-indoor-endpoints"
                        lineColor="#9d1e30"
                        lineWidth={6}
                        showInfoCard={false}
                        showEndpoints={false}
                        useIndoorData={true}
                        IndoorDirections={originIndoorSteps}
                    />
                )}
                {destinationIndoorSteps && showRouteOverview && (
                    <DirectionsLine
                        directions={buildIndoorSummary(destinationIndoorSteps)}
                        sourceId="destination-indoor-source"
                        layerId="destination-indoor-layer"
                        endpointId="destination-indoor-endpoints"
                        lineColor="#9d1e30"
                        lineWidth={6}
                        showInfoCard={false}
                        showEndpoints={false}
                        useIndoorData={true}
                        IndoorDirections={destinationIndoorSteps}
                    />
                )}
                {originOutdoorConnector && (
                    <DirectionsLine
                        directions={buildIndoorSummary(originIndoorSteps ?? [])}
                        coordinatesOverride={originOutdoorConnector}
                        sourceId="origin-outdoor-connector-source"
                        layerId="origin-outdoor-connector-layer"
                        endpointId="origin-outdoor-connector-endpoints"
                        lineColor="#9ca3af"
                        lineWidth={3}
                        lineDasharray={[1.5, 1.5]}
                        showInfoCard={false}
                        showEndpoints={false}
                    />
                )}
                {destinationOutdoorConnector && (
                    <DirectionsLine
                        directions={buildIndoorSummary(destinationIndoorSteps ?? [])}
                        coordinatesOverride={destinationOutdoorConnector}
                        sourceId="destination-outdoor-connector-source"
                        layerId="destination-outdoor-connector-layer"
                        endpointId="destination-outdoor-connector-endpoints"
                        lineColor="#9ca3af"
                        lineWidth={3}
                        lineDasharray={[1.5, 1.5]}
                        showInfoCard={false}
                        showEndpoints={false}
                    />
                )}
                {selectedMode === 'Shuttle' && (
                    <ShuttleRouteOverlay
                        walkToStop={isNavigating ? activeShuttleLegs?.walkToStop ?? null : shuttleRouting.walkToStop}
                        shuttleLeg={isNavigating ? activeShuttleLegs?.shuttleLeg ?? null : shuttleRouting.shuttleLeg}
                        walkFromStop={isNavigating ? activeShuttleLegs?.walkFromStop ?? null : shuttleRouting.walkFromStop}
                        stopsForTrip={shuttleRouting.stopsForTrip}
                        stopMarkers={shuttleRouting.stopMarkers}
                    />
                )}
            </MapboxGL.MapView>

             {!isNavigating && !activeIndoorSegment && (
                  <View style={styles.topBar}>
                      <CampusBadge campus={campusMeta}/>
                      <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push('/account' as Href)}
                          style={[styles.accountButton, {backgroundColor: theme.background}]}
                      >
                          <Text style={[styles.accountButtonText, {color: theme.text}]}>Calendar</Text>
                      </Pressable>
                  </View>
              )}

              {!isNavigating && !activeIndoorSegment && (
                  <View style={styles.switchContainer}>
                      <CampusSwitch options={campuses} value={campus} onChange={setCampus}/>
                  </View>
              )}

            <View style={styles.searchContainer} pointerEvents="box-none">
                {!isNavigating && !activeIndoorSegment && (
                <>
                {!seeDirectionBar &&
                    <MapSearchBar
                        mapsAdapter={mapsAdapter}
                        toValue={to}
                        onChangeText={(text) => {
                            setTo(text)
                            clearDestinationRouting();
                        }}
                        onClickButton={() => {
                            setStartingPointAsUserCoordinates();
                            setSeeDirectionBar(true);
                            if (userLocation) {
                                cameraRef?.current?.setCamera({
                                    centerCoordinate: userLocation,
                                    zoomLevel: 18,
                                    animationDuration: 800,
                                });
                            }
                        }}
                        onSelectBuilding={(mapLocation, coordinates) => {
                            setTo(getSelectedLocationLabel(mapLocation));
                            clearPOICategory();
                            setClassroomDestination(toClassroomDestination(mapLocation));
                            if (!cameraRef.current) return;
                            if (coordinates) {
                                setToCoordinates(coordinates);
                                focusCamera(coordinates);
                                // Switch campus so the correct building polygons load
                                const nearest = getNearestCampus(coordinates[0], coordinates[1], campusMetaById);
                                if (nearest) setCampus(nearest);
                            }
                        }}
                        onClear={() => {
                            setTo('');
                            setToCoordinates(null);
                            clearDestinationRouting();
                        }}
                    />
                }
                {seeDirectionBar &&
                    <DirectionBar
                        mapsAdapter={mapsAdapter}
                        fromValue={from}
                        toValue={to}
                        onChangeFrom={(text) => {
                            setFrom(text);
                            clearOriginRouting();
                        }}
                        onChangeTo={(text) => {
                            setTo(text);
                            clearDestinationRouting();
                        }}
                        onSelectFrom={(mapLocation, coordinates) => {
                            setFrom(getSelectedLocationLabel(mapLocation));
                            setClassroomOrigin(toClassroomOrigin(mapLocation));
                            if (!cameraRef.current) return;
                            if (coordinates) {
                                setFromCoordinates(coordinates);
                                fromCoordinatesIsUserLocation.current = false;
                                focusCamera(coordinates);
                                // Switch campus so the correct building polygons load
                                const nearest = getNearestCampus(coordinates[0], coordinates[1], campusMetaById);
                                if (nearest) setCampus(nearest);
                            }
                        }}
                        onSelectTo={(mapLocation, coordinates) => {
                            setTo(getSelectedLocationLabel(mapLocation));
                            setClassroomDestination(toClassroomDestination(mapLocation));
                            if (!cameraRef.current) return;
                            if (coordinates) {
                                setToCoordinates(coordinates);
                                cameraRef.current.setCamera({
                                    centerCoordinate: coordinates,
                                    zoomLevel: 18,
                                    animationDuration: 800,
                                });
                                // Switch campus so the correct building polygons load
                                const nearest = getNearestCampus(coordinates[0], coordinates[1], campusMetaById);
                                if (nearest) setCampus(nearest);
                            }
                        }}
                        onClearFrom={() => {
                            setFrom("");
                            setFromCoordinates(null);
                            clearOriginRouting();
                            fromCoordinatesIsUserLocation.current = false;
                            setDirections(null);
                        }}
                        onClearTo={() => {
                            setTo("");
                            setToCoordinates(null);
                            clearDestinationRouting();
                            setDirections(null);
                        }}
                        onSwap={() => {
                            // Swap text
                            const tempFrom = from;
                            setFrom(to);
                            setTo(tempFrom);

                            // Swap coordinates
                            const tempFromCoordinates = fromCoordinates;
                            setFromCoordinates(toCoordinates);
                            setToCoordinates(tempFromCoordinates);

                            const tempClassroomOrigin = classroomOrigin;
                            clearOriginRouting();
                            setClassroomOrigin(classroomDestination);
                            setClassroomDestination(tempClassroomOrigin);

                            // Swap user location flag
                            fromCoordinatesIsUserLocation.current = false; // If "to" becomes "from", it's no longer user location
                            // Note: We can't track if the original "to" was user location, so we reset this flag
                        }}
                        onResetFrom={() => {
                            setStartingPointAsUserCoordinates();
                            if (userLocation) {
                                focusCamera(userLocation);
                            }
                        }}
                        onClose={() => {
                            setSeeDirectionBar(false);
                            setFrom('');
                            setFromCoordinates(null);
                            clearOriginRouting();
                            fromCoordinatesIsUserLocation.current = false;
                            setDirections(null);
                            setTo('');
                            setToCoordinates(null);
                            clearDestinationRouting();
                        }}
                    />
                }
                    {(!isNavigating && (to ==="" || from ==="") && (!toCoordinates || !fromCoordinates)) &&
                    <POICategory
                        userLocation={userLocation ?? fromCoordinates ?? toCoordinates}
                        radius={0.8}
                        onSelectCategory={(category, pois) => {setPoiMarkers(pois);setSelectedOutdoorPOI(null);}}
                        onClearCategory={() => {setPoiMarkers([]); setSelectedOutdoorPOI(null);}}
                        marginTop={seeDirectionBar ? 11 : 65}
                        clearTrigger={poiClearTrigger}
                    />}

                <View style={styles.accessibilityToggleContainer}>
                    <AccessibilityToggle 
                        enabled={accessible} 
                        onToggle={(value) => {
                            setAccessible(value);
                            if (value) setShowAccessibilityModal(true);
                        }}
                    />
                </View>
                </>
                )}
            </View>

            {shouldShowNextClassPrompt && nextClassPromptBody ? (
                <NextClassPrompt
                    body={nextClassPromptBody}
                    onDismiss={() => setDismissedNextClassEventId(nextClassDestination?.eventId ?? null)}
                    onStartDirections={startDirectionsToNextClass}
                    title='Your next class is coming up!'
                />
            ): null}

            {shouldShowNoLocationStatus && nextClassNoLocationBody ? (
                <View pointerEvents='box-none' style={styles.nextClassStatusContainer}>
                    <ThemedView
                        style={[
                            styles.nextClassStatusCard,
                            {backgroundColor: theme.background},
                        ]}
                    >
                        <ThemedText style={styles.nextClassStatusTitle}>No location found</ThemedText>
                        <ThemedText style={styles.nextClassStatusBody}>{nextClassNoLocationBody}</ThemedText>
                        <Pressable
                            accessibilityRole='button'
                            onPress={() => setDismissedNextClassEventId(nextClassResult.status === 'no_location' ? nextClassResult.event.id : null)}
                            style={styles.nextClassStatusButton}
                            testID='next-class-no-location-dismiss'
                        >
                            <ThemedText style={styles.nextClassStatusButtonText}>Dismiss</ThemedText>
                        </Pressable>
                    </ThemedView>
                </View>
            ) : null}

            {fromCoordinates && toCoordinates && (routeValidation?.valid || shouldStartDestinationIndoorOnly) && !isNavigating && routeFromCoordinates && routeToCoordinates && (
                <View
                    testID="navigation-bottom-container"
                    style={styles.navigationBottomContainer}
                    onLayout={() => {}}
                    ref={(ref) => { if (!ref) navigationBottomFrame.current = null; }}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
                    <NavigationBottom
                        campuses={campusMetaById}
                        origin={{
                            longitude: routeFromCoordinates[0],
                            latitude: routeFromCoordinates[1]
                        }}
                        destination={{
                            longitude: routeToCoordinates[0],
                            latitude: routeToCoordinates[1]
                        }}
                        onDirectionsChange={setDirections}
                        onModeChange={setSelectedMode}
                        onTimeFilterChange={(t, m) => { setTimeFilter(t); setTimeFilterMode(m); }}
                        onCardLayout={handleNavigationBottomLayout}
                        onStartPress={handleStartPress}
                    />
                </View>
            )}

            {/* ── Step-by-step navigation panel (US-2.7) ── */}
            {isNavigating && (
                <NavigationOverlay
                    steps={activeSteps}
                    totalDurationSeconds={
                        selectedMode === 'Shuttle'
                            ? (shuttleRouting.walkToStop?.durationSeconds ?? 0) +
                              (shuttleRouting.shuttleLeg?.durationSeconds ?? 0) +
                              (shuttleRouting.walkFromStop?.durationSeconds ?? 0)
                            : (directions?.durationSeconds ?? 0)
                    }
                    cameraRef={cameraRef}
                    origin={navigationOrigin
                        ? { longitude: navigationOrigin[0], latitude: navigationOrigin[1] }
                        : { longitude: 0, latitude: 0 }
                    }
                    destination={activeDestinationCoordinates
                        ? { longitude: activeDestinationCoordinates[0], latitude: activeDestinationCoordinates[1] }
                        : { longitude: 0, latitude: 0 }
                    }
                    transportMode={transportMode}
                    provider={selectedMode === 'Transit' ? Provider.GOOGLE_MAPS : Provider.MAPBOX}
                    followLiveLocation={navigationUsesLiveLocation}
                    shuttlePhaseBoundaries={activeShuttlePhaseBoundaries}
                    onIndoorHandoff={destinationIndoorSteps ? () => {
                        if (destinationIndoorHandoffDoneRef.current) return;
                        destinationIndoorHandoffDoneRef.current = true;
                        openDestinationIndoorMap();
                    } : undefined}
                    onArrived={handleNavigationExit}
                    onRecalculated={(newDirections) => {
                        setDirections(newDirections);
                        setActiveSteps(newDirections.steps ?? []);
                    }}
                    onExit={handleNavigationExitMidRoute}
                />
            )}

            {!activeIndoorSegment && (
                <LocateMeButton
                    style={styles.locateButton}
                    onPress={async () => {
                        if (cameraRef.current && userLocation) {
                            const nearest = getNearestCampus(userLocation[0], userLocation[1], campusMetaById);
                            if (nearest) setCampus(nearest);
                            cameraRef.current.setCamera({
                                centerCoordinate: userLocation,
                                zoomLevel: Math.max(campusMeta.zoom, 17),
                                animationDuration: 600,
                            });
                            return;
                        }
                        if (
                            Platform.OS === 'android' &&
                            locationPermissionStatus !== 'granted' &&
                            typeof MapboxGL.requestAndroidLocationPermissions === 'function'
                        ) {
                            const granted = await MapboxGL.requestAndroidLocationPermissions();
                            if (granted) {
                                setLocationPermissionStatus('granted');
                                return;
                            }
                            setLocationPermissionStatus('denied');
                        }
                        setShowLocationPrompt(true);
                    }}
                />
            )}
            <OutdoorPOICard
                poi={selectedOutdoorPOI}
                userLocation={userLocation ? { longitude: userLocation[0], latitude: userLocation[1] } : null} 
                onClose={() => {setSelectedOutdoorPOI(null);}}
                onGetDirections={() => {
                    if (!selectedOutdoorPOI) return;
                    setSeeDirectionBar(true);
                    setTo(selectedOutdoorPOI.name);
                    setToCoordinates([selectedOutdoorPOI.coordinates.longitude, selectedOutdoorPOI.coordinates.latitude]);
                    if (userLocation) {
                        setFrom("Your location");
                        setFromCoordinates(userLocation);
                        fromCoordinatesIsUserLocation.current = true;
                    }
                    setPoiMarkers([]);
                    setSelectedOutdoorPOI(null);
                }}
            />
            <Modal
                transparent
                animationType="fade"
                visible={showLocationPrompt}
                onRequestClose={() => setShowLocationPrompt(false)}
            >
                <View style={styles.modalBackdrop}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowLocationPrompt(false)}
                    />
                    <ThemedView
                        style={[
                            styles.modalCard,
                            {backgroundColor: theme.background, borderColor: theme.icon},
                        ]}
                    >
                        <ThemedText type="subtitle" style={styles.modalTitle}>
                            Location Off
                        </ThemedText>
                        <ThemedText style={styles.modalBody}>
                            Enable location access to center the map on you.
                        </ThemedText>
                        <Pressable
                            style={[styles.modalButton, {backgroundColor: theme.tint}]}
                            onPress={() => setShowLocationPrompt(false)}
                        >
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </Pressable>
                    </ThemedView>
                </View>
            </Modal>

      <BuildingInfoModal
        visible={!!selectedBuilding}
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        onIndoorMap={() => {
            if (selectedBuilding?.code) {
                setSelectedBuilding(null);
                const campusQuery = selectedBuilding.campus
                    ? `?campus=${encodeURIComponent(selectedBuilding.campus)}`
                    : '';
                router.push(`/indoor/${encodeURIComponent(selectedBuilding.code)}${campusQuery}` as Href);
            }
        }}
        onDirections={navigateToSelectedBuilding}
      />

            <Modal
                transparent
                animationType="fade"
                visible={showValidationError}
                onRequestClose={() => setShowValidationError(false)}
            >
                <View style={styles.modalBackdrop}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowValidationError(false)}
                    />
                    <ThemedView
                        style={[
                            styles.modalCard,
                            {backgroundColor: theme.background, borderColor: theme.icon},
                        ]}
                    >
                        <ThemedText type="subtitle" style={styles.modalTitle}>
                            Invalid Route
                        </ThemedText>
                        <ThemedText style={styles.modalBody}>
                            {routeValidation && !routeValidation.valid ? routeValidation.message : 'This route could not be validated.'}
                        </ThemedText>
                        <Pressable
                            style={[styles.modalButton, {backgroundColor: theme.tint}]}
                            onPress={() => setShowValidationError(false)}
                        >
                            <Text style={styles.modalButtonText}>Dismiss</Text>
                        </Pressable>
                    </ThemedView>
                </View>
            </Modal>

            <Modal
                transparent
                animationType="fade"
                visible={showTimeoutModal}
                onRequestClose={() => setShowTimeoutModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowTimeoutModal(false)}
                    />
                    <ThemedView
                        style={[
                            styles.modalCard,
                            {backgroundColor: theme.background, borderColor: theme.icon},
                        ]}
                    >
                        <ThemedText type="subtitle" style={styles.modalTitle}>
                            Directions Unavailable
                        </ThemedText>
                        <ThemedText style={styles.modalBody}>
                            The directions request took too long. Please try again.
                        </ThemedText>
                        <Pressable
                            style={[styles.modalButton, {backgroundColor: theme.tint}]}
                            onPress={() => setShowTimeoutModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Dismiss</Text>
                        </Pressable>
                    </ThemedView>
                </View>
            </Modal>

            <Modal
                transparent
                animationType="fade"
                visible={showAccessibilityModal}
                onRequestClose={() => setShowAccessibilityModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <Pressable
                        testID="accessibility-modal-backdrop"
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowAccessibilityModal(false)}
                    />
                    <ThemedView
                        style={[
                            styles.modalCard,
                            {backgroundColor: theme.background, borderColor: theme.icon},
                        ]}
                    >
                        <ThemedText type="subtitle" style={styles.modalTitle}>
                            Accessibility Mode
                        </ThemedText>
                        <ThemedText style={styles.modalBody}>
                            Accessibility mode only affects indoor directions.
                        </ThemedText>
                        <Pressable
                            style={[styles.modalButton, {backgroundColor: theme.tint}]}
                            onPress={() => setShowAccessibilityModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </Pressable>
                    </ThemedView>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    markerPin: {
        height: 28, width: 28, backgroundColor: '#ffffff', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
        borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
    },
    markerText: {color: '#9d1e30', fontWeight: '900', fontSize: 14},
    topBar: {
        position: 'absolute', top: 32, left: 16, right: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    accountButton: {
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    accountButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    switchContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 40,
        alignItems: 'center',
    },
    locateButton: {
        position: 'absolute',
        right: 16,
        bottom: '35%',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    modalTitle: {
        marginBottom: 6,
    },
    modalBody: {
        marginBottom: 16,
    },
    modalButton: {
        alignSelf: 'flex-start',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    searchContainer: {
        position: 'absolute',
        top: 70,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        pointerEvents: 'box-none',
    },
    navigationBottomContainer: {
        position: 'absolute',
        left: 4,
        right: 4,
        bottom: 5,
        zIndex: 15,
    },
    poiMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    poiMarkerText: {
        fontSize: 24,
    },
    poiCallout: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    poiCalloutContainer: {
        width: 180,
        minHeight: 60,
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    poiCalloutTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    poiCalloutAddress: {
        fontSize: 11,
        color: '#666666',
        lineHeight: 15,
        flexWrap: 'wrap',
    },
    nextClassStatusContainer: {
        left: 16,
        position: 'absolute',
        right: 16,
        top: '30%',
        zIndex: 20,
    },
    nextClassStatusCard: {
        borderRadius: 24,
        elevation: 12,
        paddingHorizontal: 22,
        paddingVertical: 18,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.18,
        shadowRadius: 16,
    },
    nextClassStatusTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 18,
        textAlign: 'center',
    },
    nextClassStatusBody: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 18,
        textAlign: 'center',
    },
    nextClassStatusButton: {
        alignSelf: 'stretch',
        backgroundColor: '#5b5b5b',
        borderRadius: 14,
        paddingVertical: 14,
    },
    nextClassStatusButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    accessibilityToggleContainer: {
        top: 10,
        left: 10,
    }
});
