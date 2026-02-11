import {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, View, Text, Image, Modal, Pressable, Platform} from 'react-native';

import DirectionBar from "@/components/directions-bars";
import {PolygonUtils} from '@/domain/PolygonUtils';
import {CampusBadge} from '@/components/campus-badge';
import {CampusSwitch} from '@/components/campus-switch';
import {LocateMeButton} from '@/components/locate-me-button';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {Colors} from '@/constants/theme';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {useNavigationController} from '@/controllers/navigation-controller';
import {MapboxGL} from '@/services/mapbox';
import MapSearchBar from '@/components/search-bar';
import {Coordinates} from '@/services/maps/maps-provider';
import {DirectionsLine} from "@/components/ui/directions-line";
import {NavigationBottom} from "@/components/ui/navigation-bottom";
import {
    DirectionsResponse,
    initializeDirectionsCache,
    addDirectionsListener
} from '@/services/maps/directions-api-adapter';


const HONEYCOMB_IMAGE = require('@/assets/images/honeycomb.png');
const BEE_IMAGE = require('@/assets/images/bee.png');

const isPointInRing = (point: [number, number], ring: [number, number][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect =
            yi > point[1] !== yj > point[1] &&
            point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

const isPointInPolygon = (point: [number, number], coordinates: [number, number][][]) => {
    if (!coordinates?.length) return false;
    if (!isPointInRing(point, coordinates[0])) return false;
    for (let i = 1; i < coordinates.length; i += 1) {
        if (isPointInRing(point, coordinates[i])) return false;
    }
    return true;
};

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
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const [directions, setDirections] = useState<DirectionsResponse | null>(null);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [fromCoordinates, setFromCoordinates] = useState<Coordinates | null>(null);
    const [toCoordinates, setToCoordinates] = useState<Coordinates | null>(null);
    const fromCoordinatesIsUserLocation = useRef(false);
    const [seeDirectionBar, setSeeDirectionBar] = useState<boolean>(false);


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
        if (!cameraRef.current) return;
        cameraRef.current.setCamera({
            centerCoordinate: campusMeta.center,
            zoomLevel: campusMeta.zoom,
            animationDuration: 800,
        });
    }, [campusMeta]);

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
    const campusTitle = useMemo(
        () => `${campusMeta.name} Campus (${campusMeta.label})`,
        [campusMeta],
    );

    // --- FEATURE BUILDER ---
    const {polygonFeatures, dotPoints} = useMemo(() => {
        const polys = [];
        const dots = [];

        for (const point of points) {
            const loc = point.building.location as any;
            if (loc && loc.type === 'Polygon' && loc.coordinates) {
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
                    geometry: {type: 'Polygon' as const, coordinates: coords},
                    properties: {name: point.building.name, isUserBuilding: inUserBuilding},
                });
            } else {
                dots.push(point);
            }
        }
        return {polygonFeatures: polys, dotPoints: dots};
    }, [points, userLocation]);

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

    if (!tokenAvailable) return <ThemedView style={styles.centered}><ThemedText>No Token</ThemedText></ThemedView>;
    if (!hydrated) return <ThemedView style={styles.centered}><ActivityIndicator/></ThemedView>;

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
                    showsUserHeadingIndicator={false}
                    onUpdate={(loc: any) => {
                        const coords = loc?.coords;
                        if (!coords) return;
                        setUserLocation([coords.longitude, coords.latitude]);
                        setLocationPermissionStatus('granted');
                        setShowLocationPrompt(false);
                    }}
                />

                <MapboxGL.Images
                    images={{
                        honeycomb: {
                            uri: Image.resolveAssetSource(HONEYCOMB_IMAGE).uri,
                            scale: 10.0
                        },
                        bee: {
                            uri: Image.resolveAssetSource(BEE_IMAGE).uri,
                            scale: 1.0,
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
                        <View/>
                    </MapboxGL.PointAnnotation>
                }
                {directions && (
                    <DirectionsLine
                        directions={directions}
                        infoCardPosition="top"
                    />
                )}
            </MapboxGL.MapView>

            <View style={styles.topBar}>
                <CampusBadge campus={campus}/>
            </View>

            <View style={styles.switchContainer}>
                <CampusSwitch value={campus} onChange={setCampus}/>
            </View>

            <View style={styles.searchContainer} pointerEvents="box-none">
                {!seeDirectionBar &&
                    <MapSearchBar
                        mapsAdapter={mapsAdapter}
                        toValue={to}
                        onChangeText={(text) => {
                            setTo(text)
                        }}
                        onClickButton={() => {
                            setFrom('Your location');
                            setFromCoordinates(userLocation);
                            fromCoordinatesIsUserLocation.current = true;
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
                                cameraRef.current.setCamera({
                                    centerCoordinate: coordinates,
                                    zoomLevel: 18,
                                    animationDuration: 800,
                                });
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
                                cameraRef.current.setCamera({
                                    centerCoordinate: coordinates,
                                    zoomLevel: 18,
                                    animationDuration: 800,
                                });
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
                            const tempIsUserLocation = fromCoordinatesIsUserLocation.current;
                            fromCoordinatesIsUserLocation.current = false; // If "to" becomes "from", it's no longer user location
                            // Note: We can't track if the original "to" was user location, so we reset this flag
                        }}
                        onResetFrom={() => {
                            setFrom('Your location');
                            setFromCoordinates(userLocation);
                            fromCoordinatesIsUserLocation.current = true;
                            if (userLocation) {
                                cameraRef?.current?.setCamera({
                                    centerCoordinate: userLocation,
                                    zoomLevel: 18,
                                    animationDuration: 800,
                                });
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
            </View>

            {fromCoordinates && toCoordinates && (
                <View style={styles.navigationBottomContainer}>
                    <NavigationBottom
                        origin={{
                            longitude: fromCoordinates[0],
                            latitude: fromCoordinates[1]
                        }}
                        destination={{
                            longitude: toCoordinates[0],
                            latitude: toCoordinates[1]
                        }}
                        onDirectionsChange={setDirections}
                        onStartPress={() => console.log('Start navigation')}
                    />
                </View>
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
        left: 12,
        right: 12,
        bottom: 20,
        zIndex: 15,
    },
});
