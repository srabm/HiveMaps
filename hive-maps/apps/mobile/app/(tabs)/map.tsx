import { Href, useRouter } from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, View, Text, Image, Modal, Pressable, Platform} from 'react-native';

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
import {Coordinates} from '@/services/maps/maps-provider';
import {DirectionsLine} from "@/components/ui/directions-line";
import {NavigationBottom} from "@/components/ui/navigation-bottom";
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
import {useShuttleRouting} from '@/hooks/use-shuttle-routing';
import {ShuttleRouteOverlay} from '@/components/ui/shuttle-route-overlay';
import {validateCampusRoute, getNearestCampus, type ValidationResult} from '@/services/maps/route-validator';
import {getCameraBoundsForRoute} from '@/services/maps/camera-utils';
import {useLiveLocation} from '@/hooks/use-live-location';
import {useStepNavigator, type ShuttlePhaseBoundaries} from '@/hooks/use-step-navigator';
import {StepByStepPanel} from '@/components/ui/step-by-step-panel';
import type { CampusId } from '@/types/campus';


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
    campus?: CampusId;
    name?: string;
    addresses?: string[];
    coordinates?: Coordinates;
    phone?: string;
    website?: string;
    hours?: string;
    allHours?: string[];
    hasIndoorMap?: boolean;
} & Record<string, unknown>;


// ─── NavigationOverlay ────────────────────────────────────────────────────────
// Extracted as its own component so hooks (useLiveLocation, useStepNavigator)
// are called unconditionally and can be safely mounted/unmounted.
type NavigationOverlayProps = {
    steps: Step[];
    totalDurationSeconds: number;
    cameraRef: React.RefObject<MapboxGL.Camera | null>;
    destination: { longitude: number; latitude: number };
    transportMode: TransportMode;
    provider: Provider;
    /**
     * When provided, the overlay is in shuttle mode.
     * Off-route detection is suppressed only during the shuttle-ride segment;
     * the walk legs retain full detection.
     */
    shuttlePhaseBoundaries?: ShuttlePhaseBoundaries;
    onRecalculated: (newDirections: DirectionsResponse) => void;
    onExit: () => void;
};

function NavigationOverlay({
    steps,
    totalDurationSeconds,
    cameraRef,
    destination,
    transportMode,
    provider,
    shuttlePhaseBoundaries,
    onRecalculated,
    onExit,
}: Readonly<NavigationOverlayProps>) {
    const { location } = useLiveLocation(true);
    const stepNav = useStepNavigator(steps, location, shuttlePhaseBoundaries);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const recalcInFlightRef = useRef(false);
    const initialLockDone = useRef(false);

    // Stable refs so the recalc effect doesn't re-fire when callbacks change identity
    const onRecalculatedRef = useRef(onRecalculated);
    onRecalculatedRef.current = onRecalculated;
    const clearOffRouteRef = useRef(stepNav.clearOffRoute);
    clearOffRouteRef.current = stepNav.clearOffRoute;
    const destinationRef = useRef(destination);
    destinationRef.current = destination;

    // Camera follow
    useEffect(() => {
        if (!location) return;
        if (!initialLockDone.current) {
            initialLockDone.current = true;
            cameraRef.current?.setCamera({
                centerCoordinate: [location.longitude, location.latitude],
                zoomLevel: 19,
                animationDuration: 800,
            });
            return;
        }
        cameraRef.current?.setCamera({
            centerCoordinate: [location.longitude, location.latitude],
            animationDuration: 1000,
            animationMode: 'easeTo',
        });
    }, [location, cameraRef]);

    // Off-route recalculation — only fires when isOffRoute flips to true
    useEffect(() => {
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
    }, [stepNav.isOffRoute]);

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
    const colorScheme = useColorScheme();
    const cameraRef = useRef<MapboxGL.Camera>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const [directions, setDirections] = useState<DirectionsResponse | null>(null);
    const [selectedMode, setSelectedMode] = useState<'Drive' | 'Walk' | 'Transit' | 'Shuttle'>('Drive');
    const [timeFilter, setTimeFilter] = useState(() => new Date().toISOString());
    const [timeFilterMode, setTimeFilterMode] = useState<'depart' | 'arrive'>('depart');
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);

  const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [fromCoordinates, setFromCoordinates] = useState<Coordinates | null>(null);
    const [toCoordinates, setToCoordinates] = useState<Coordinates | null>(null);
    const fromCoordinatesIsUserLocation = useRef(false);
    const [seeDirectionBar, setSeeDirectionBar] = useState<boolean>(false);
    const [routeValidation, setRouteValidation] = useState<ValidationResult | null>(null);
    const [showValidationError, setShowValidationError] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
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

    function setStartingPointAsUserCoordinates() {
        setFrom('Your location');
        setFromCoordinates(userLocation);
        fromCoordinatesIsUserLocation.current = true;
    }

    function navigateToSelectedBuilding() {
        if (!selectedBuilding) return;
        setStartingPointAsUserCoordinates();
        setTo(selectedBuilding.name + (!!selectedBuilding.addresses && selectedBuilding.addresses.length > 0 ? ', ' + selectedBuilding.addresses[0] : ''));
        if (selectedBuilding.coordinates) {
            setToCoordinates(selectedBuilding.coordinates);
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

    const isSameCampusRoute = useMemo(() => {
        if (!fromCoordinates || !toCoordinates) return false;
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: fromCoordinates[0], latitude: fromCoordinates[1]},
            destination: {type: 'coordinate', longitude: toCoordinates[0], latitude: toCoordinates[1]},
        }, campusMetaById);
        return !result.valid || !result.route.isInterCampus;
    }, [fromCoordinates, toCoordinates, campusMetaById]);

    const shuttleRouting = useShuttleRouting({
        enabled: selectedMode === 'Shuttle' && !isSameCampusRoute && !isNavigating,
        origin: fromCoordinates ? {longitude: fromCoordinates[0], latitude: fromCoordinates[1]} : null,
        destination: toCoordinates ? {longitude: toCoordinates[0], latitude: toCoordinates[1]} : null,
        timeFilter,
        timeFilterMode,
    });

    // 2.4.2 — Validate campus-to-campus route when both endpoints are set
    useEffect(() => {
        if (!fromCoordinates || !toCoordinates) {
            setRouteValidation(null);
            return;
        }
        const result = validateCampusRoute({
            origin: {type: 'coordinate', longitude: fromCoordinates[0], latitude: fromCoordinates[1]},
            destination: {type: 'coordinate', longitude: toCoordinates[0], latitude: toCoordinates[1]},
        }, campusMetaById);
        setRouteValidation(result);
        // Never show the validation error modal while actively navigating —
        // recalculation uses the live GPS position which may be off-campus.
        if (!result.valid && !isNavigating) {
            setShowValidationError(true);
            setDirections(null);
        }
    }, [campusMetaById, fromCoordinates, toCoordinates]);

    // 2.4.3 — Auto-zoom camera for inter-campus routes when directions arrive
    useEffect(() => {
        if (!directions || !routeValidation?.valid || isNavigating) return;
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
    }, [campusMetaById, directions, routeValidation]);

    useEffect(() => {
        if (!campusMeta) return;
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

  // --- FEATURE BUILDER ---
  const polygonFeatures = useMemo(() => buildPolygonFeatures(points, userLocation), [points, userLocation]);

    const shapeCollection = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: polygonFeatures,
    }), [polygonFeatures]);

    const userLocationShape = useMemo(() => {
        if (!userLocation) return null;
        return {
            type: 'FeatureCollection' as const,
            features: [
                {
                    type: 'Feature' as const,
                    id: 'user-location',
                    geometry: {type: 'Point' as const, coordinates: userLocation},
                    properties: {},
                },
            ],
        };
    }, [userLocation]);

    let transportMode: TransportMode = TransportMode.WALKING;
    if (selectedMode === 'Drive') transportMode = TransportMode.DRIVING;
    else if (selectedMode === 'Transit') transportMode = TransportMode.TRANSIT;

    const handleStartPress = useCallback(() => {
        const isShuttleMode = selectedMode === 'Shuttle';
        if (!isShuttleMode && !directions) return;
        const walkToSteps = shuttleRouting.walkToStop?.steps ?? [];
        const rawShuttleSteps = shuttleRouting.shuttleLeg?.steps ?? [];
        const walkFromSteps = shuttleRouting.walkFromStop?.steps ?? [];

        const originName = shuttleRouting.stopsForTrip?.originStop?.name ?? 'Shuttle Stop';
        const destName   = shuttleRouting.stopsForTrip?.destinationStop?.name ?? 'Shuttle Stop';
        const destStopCoord = shuttleRouting.stopsForTrip?.destinationStop?.coordinate;
        const originStopCoord = shuttleRouting.stopsForTrip?.originStop?.coordinate;

        const totalShuttleDist = rawShuttleSteps.reduce((s, st) => s + st.distance, 0);
        const totalShuttleDur  = rawShuttleSteps.reduce((s, st) => s + st.duration, 0);

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
    }, [selectedMode, directions, shuttleRouting]);

    const handleNavigationExit = useCallback(() => {
        setIsNavigating(false);
        if (toCoordinates) {
            const nearest = getNearestCampus(toCoordinates[0], toCoordinates[1], campusMetaById);
            if (nearest) setCampus(nearest);
        }
        setSeeDirectionBar(false);
        setFrom('');
        setFromCoordinates(null);
        fromCoordinatesIsUserLocation.current = false;
        setTo('');
        setToCoordinates(null);
        setDirections(null);
        setActiveSteps([]);
        setActiveShuttlePhaseBoundaries(undefined);
        setActiveShuttleLegs(null);
    }, [toCoordinates, campusMetaById, setCampus]);
    const handleBuildingPress = useCallback((e: Parameters<NonNullable<import('react').ComponentProps<typeof MapboxGL.ShapeSource>['onPress']>>[0]) => {
        if (isNavigating) return;
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
                fillOpacity: 0.6,
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
                                fillColor: '#ffffff',
                                fillOpacity: 0.35,
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
                {fromCoordinates &&
                    <MapboxGL.PointAnnotation
                        key='fromPoint'
                        id='fromPoint'
                        coordinate={fromCoordinates}
                    >
                        <View/>
                    </MapboxGL.PointAnnotation>
                }

                {toCoordinates &&
                    <MapboxGL.PointAnnotation
                        key='toPoint'
                        id='toPoint'
                        coordinate={toCoordinates}
                    >
                        <View style={{alignItems: 'center', justifyContent: 'center'}}>
                            <Text style={{fontSize: 28, color: '#d32f2f'}}>🚩</Text>
                        </View>
                    </MapboxGL.PointAnnotation>
                }
                {directions && selectedMode !== 'Shuttle' && (
                    <DirectionsLine
                        directions={directions}
                        infoCardPosition="top"
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

             {!isNavigating && (
                  <View style={styles.topBar}>
                      <CampusBadge campus={campusMeta}/>
                  </View>
              )}

              {!isNavigating && (
                  <View style={styles.switchContainer}>
                      <CampusSwitch options={campuses} value={campus} onChange={setCampus}/>
                  </View>
              )}

            <View style={styles.searchContainer} pointerEvents="box-none">
                {!isNavigating && (
                <>
                {!seeDirectionBar &&
                    <MapSearchBar
                        mapsAdapter={mapsAdapter}
                        toValue={to}
                        onChangeText={(text) => {
                            setTo(text)
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
                            setTo(mapLocation.name + (mapLocation.address ? ', ' + mapLocation.address : ''));
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
                        }}
                    />
                }
                {seeDirectionBar &&
                    <DirectionBar
                        mapsAdapter={mapsAdapter}
                        fromValue={from}
                        toValue={to}
                        onChangeFrom={setFrom}
                        onChangeTo={setTo}
                        onSelectFrom={(mapLocation, coordinates) => {
                            setFrom(mapLocation.name + (mapLocation.address ? ', ' + mapLocation.address : ''));
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
                            setTo(mapLocation.name + (mapLocation.address ? ', ' + mapLocation.address : ''));
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
                            fromCoordinatesIsUserLocation.current = false;
                            setDirections(null);
                        }}
                        onClearTo={() => {
                            setTo("");
                            setToCoordinates(null);
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
                            fromCoordinatesIsUserLocation.current = false;
                            setDirections(null);
                            setTo('');
                            setToCoordinates(null);
                        }}
                    />
                }
                </>
                )}
            </View>

            {fromCoordinates && toCoordinates && routeValidation?.valid && !isNavigating && (
                <View style={styles.navigationBottomContainer}>
                    <NavigationBottom
                        campuses={campusMetaById}
                        origin={{
                            longitude: fromCoordinates[0],
                            latitude: fromCoordinates[1]
                        }}
                        destination={{
                            longitude: toCoordinates[0],
                            latitude: toCoordinates[1]
                        }}
                        onDirectionsChange={setDirections}
                        onModeChange={setSelectedMode}
                        onTimeFilterChange={(t, m) => { setTimeFilter(t); setTimeFilterMode(m); }}
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
                    destination={toCoordinates
                        ? { longitude: toCoordinates[0], latitude: toCoordinates[1] }
                        : { longitude: 0, latitude: 0 }
                    }
                    transportMode={transportMode}
                    provider={selectedMode === 'Transit' ? Provider.GOOGLE_MAPS : Provider.MAPBOX}
                    shuttlePhaseBoundaries={activeShuttlePhaseBoundaries}
                    onRecalculated={(newDirections) => {
                        setDirections(newDirections);
                        setActiveSteps(newDirections.steps ?? []);
                    }}
                    onExit={handleNavigationExit}
                />
            )}

            <LocateMeButton
                style={styles.locateButton}
                onPress={async () => {
                    if (cameraRef.current && userLocation) {
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
        onStart={navigateToSelectedBuilding} //temporary implementation
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
    }, searchContainer: {
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
});