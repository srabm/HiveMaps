import AsyncStorage from '@react-native-async-storage/async-storage';

export type Coordinate = {
    longitude: number;
    latitude: number;
}

export enum TransportMode {
    DRIVING,
    WALKING,
    TRANSIT
}

export enum Provider {
    MAPBOX,
    GOOGLE_MAPS
}

export type TimeFilterMode = 'depart' | 'arrive';

/**
 * Use this direction request format for both providers
 * The time is a string in this format: YYYY-MM-DDThh:mm:ssZ
 */
export type DirectionsRequest = {
    origin: Coordinate;
    destination: Coordinate;
    transportMode: TransportMode;
    provider: Provider;
    timeFilter: string;
    timeFilterMode: TimeFilterMode;
}

export interface Step {
    distance: number;
    duration: number;
    instruction: string;
    maneuver: string;
    startLocation: Coordinate;
    endLocation: Coordinate;
    polyline?: string;
    transitDetails?: any; // stopDetails, arrivalTime, departureStop, departureTime
}

/**
 * Might have to consider the interpretation of the escape character '\\' when reading the polyline (doubled for tooltip lol it never ends)
 * Converts automatically both provider responses to this universal format 💪
 */
export type DirectionsResponse = {
    distanceMeters: number;
    durationSeconds: number;
    polyline: string;
    steps: Step[];
}

// Cache for directions responses
const directionsCache = new Map<string, DirectionsResponse>();
// v2: bumped from v1 because maneuver strings now encode type+modifier
// (e.g. "turn-left" instead of bare "turn"). Old cached entries lack the
// modifier and would show wrong icons, so we intentionally ignore them.
const CACHE_STORAGE_KEY = 'directions_cache_v2';
let cacheInitialized = false;
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

/**
 * Wipe the in-memory and persisted directions cache.
 * Call this after a data-format change that invalidates existing entries.
 */
export async function clearDirectionsCache(): Promise<void> {
    directionsCache.clear();
    try {
        await AsyncStorage.removeItem(CACHE_STORAGE_KEY);
    } catch (err) {
        console.warn('[Cache] Failed to clear persisted cache', err);
    }
}

/**
 * Initialize cache from AsyncStorage on app startup
 */
export async function initializeDirectionsCache(): Promise<void> {
    if (cacheInitialized) return;

    try {
        const cachedData = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData) as Record<string, DirectionsResponse>;
            Object.entries(parsed).forEach(([key, value]) => {
                directionsCache.set(key, value);
            });
            console.log(`[Cache] Loaded ${directionsCache.size} cached routes from storage`);
        }
    } catch (err) {
        console.warn('[Cache] Failed to load cache from storage', err);
    }
    cacheInitialized = true;
}

/**
 * Persist cache to AsyncStorage
 */
async function persistCache(): Promise<void> {
    try {
        const cacheObj = Object.fromEntries(directionsCache);
        await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObj));
    } catch (err) {
        console.warn('[Cache] Failed to persist cache to storage', err);
    }
}

/**
 * Normalize coordinate to 4 decimal places for consistent cache keys
 */
function normalizeCoordinate(coord: Coordinate): Coordinate {
    return {
        longitude: Math.round(coord.longitude * 10000) / 10000,
        latitude: Math.round(coord.latitude * 10000) / 10000,
    };
}

/**
 * Generate cache key from request parameters
 * For transit mode: includes time filter and mode
 * For other modes: only origin, destination, and transport mode
 */
function generateCacheKey(request: DirectionsRequest): string {
    const normOrigin = normalizeCoordinate(request.origin);
    const normDest = normalizeCoordinate(request.destination);
    const baseKey = `${normOrigin.longitude},${normOrigin.latitude}|${normDest.longitude},${normDest.latitude}|${request.transportMode}`;

    // For transit mode, include time filter information
    if (request.transportMode === TransportMode.TRANSIT) {
        return `${baseKey}|${request.timeFilterMode}|${request.timeFilter}`;
    }

    return baseKey;
}

/**
 * Check if a cached transit route is still relevant (within reasonable time window)
 * For non-transit modes, time doesn't matter
 */
function isCacheRelevant(cachedKey: string, requestKey: string, request: DirectionsRequest): boolean {
    // For non-transit modes, exact key match is enough
    if (request.transportMode !== TransportMode.TRANSIT) {
        return cachedKey === requestKey;
    }

    // For transit mode, check if cache key matches the base (origin, destination, mode, timeFilterMode)
    const requestParts = requestKey.split('|');
    const cachedParts = cachedKey.split('|');

    // Check origin, destination, mode, and timeFilterMode match
    if (requestParts.slice(0, 4).join('|') !== cachedParts.slice(0, 4).join('|')) {
        return false;
    }

    // Check if time is within a reasonable window (5 minutes)
    try {
        const requestTime = new Date(requestParts[4]);
        const cachedTime = new Date(cachedParts[4]);
        const timeDiffMinutes = Math.abs(requestTime.getTime() - cachedTime.getTime()) / (1000 * 60);

        // Consider cache valid if within 5 minutes
        return timeDiffMinutes <= 5;
    } catch {
        return false;
    }
}

/**
 * Find a relevant cached route for transit mode
 */
function findRelevantTransitCache(request: DirectionsRequest): DirectionsResponse | null {
    if (request.transportMode !== TransportMode.TRANSIT) {
        return null;
    }

    const requestKey = generateCacheKey(request);

    for (const [cachedKey, cachedResponse] of directionsCache.entries()) {
        if (isCacheRelevant(cachedKey, requestKey, request)) {
            console.log(`[Cache HIT - Transit] Found relevant cache: ${cachedKey}`);
            return cachedResponse;
        }
    }

    return null;
}

/**
 * Parse a Google Routes API duration string to whole seconds.
 * The v2 API returns durations as strings like "1543s" or "0s".
 * Number.parseInt handles the trailing "s" suffix, but we strip it explicitly
 * and fall back to 0 so downstream arithmetic never receives NaN.
 */
function parseGoogleDuration(raw: string | number | undefined): number {
    if (raw == null) return 0;
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw).replace(/s$/, ''), 10);
    return Number.isFinite(n) ? n : 0;
}

// Google Maps Converter
export function convertGoogleMapsResponse(data: any): DirectionsResponse {
    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: Step[] = leg.steps.map((step: any) => {
        let transitDetails: any = undefined;

        // Extract transit details if they exist
        // Google Maps stores transitDetails directly at step level
        if (step.transitDetails) {
            const stopDetails = step.transitDetails.stopDetails;

            transitDetails = {
                arrivalTime: stopDetails?.arrivalTime,
                departureTime: stopDetails?.departureTime,
                stopDetails: stopDetails,
                transitLine: step.transitDetails.transitLine
            };
        }

        return {
            distance: step.distanceMeters ?? 0,
            duration: parseGoogleDuration(step.staticDuration),
            instruction: step.navigationInstruction?.instructions || '',
            maneuver: step.navigationInstruction?.maneuver || '',
            startLocation: {
                latitude: step.startLocation.latLng.latitude,
                longitude: step.startLocation.latLng.longitude
            },
            endLocation: {
                latitude: step.endLocation.latLng.latitude,
                longitude: step.endLocation.latLng.longitude
            },
            polyline: step.polyline?.encodedPolyline || '',
            transitDetails
        };
    });

    return {
        distanceMeters: route.distanceMeters ?? 0,
        durationSeconds: parseGoogleDuration(route.duration),
        polyline: route.polyline?.encodedPolyline || '',
        steps
    };
}

// Mapbox Converter
export function convertMapboxResponse(data: any): DirectionsResponse {
    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: Step[] = leg.steps.map((step: any) => ({
        distance: step.distance,
        duration: Math.round(step.duration),
        instruction: step.maneuver.instruction,
        // Combine type + modifier so icons are direction-aware.
        // e.g. type="turn" modifier="left" → "turn-left"
        // See buildMapboxManeuver below for full rules.
        maneuver: buildMapboxManeuver(step.maneuver.type, step.maneuver.modifier),
        startLocation: {
            latitude: step.intersections[0].location[1],
            longitude: step.intersections[0].location[0]
        },
        endLocation: {
            latitude: step.intersections[step.intersections.length - 1].location[1],
            longitude: step.intersections[step.intersections.length - 1].location[0]
        },
        polyline: step.geometry,
        transitDetails: undefined
    }));

    return {
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        polyline: route.geometry,
        steps
    };
}

/**
 * Combine a Mapbox maneuver type and optional modifier into the canonical
 * hyphenated string used by the MANEUVER_ICON map in step-by-step-panel.
 *
 * Mapbox modifier values: "left" | "right" | "slight left" | "slight right" |
 *                         "sharp left" | "sharp right" | "uturn" | "straight"
 */
function buildMapboxManeuver(type: string, modifier?: string): string {
    if (!type) return 'continue';

    // Normalise modifier: "slight left" -> "slight-left"
    const mod = modifier ? modifier.trim().replace(/\s+/g, '-') : '';

    // Types that never need a modifier suffix
    const standalone = new Set(['depart', 'arrive', 'merge', 'notification', 'use lane']);
    if (standalone.has(type)) return type;

    // "turn" always needs the modifier for correct icon
    if (type === 'turn') {
        return mod ? `turn-${mod}` : 'turn-right';
    }

    // Ramp types already carry direction in the type string
    if (type === 'on ramp' || type === 'off ramp') return type;

    // Roundabout family
    if (type === 'roundabout' || type === 'rotary' ||
        type === 'roundabout turn' || type === 'exit roundabout' || type === 'exit rotary') {
        if (mod === 'left') return 'roundabout-left';
        if (mod === 'right') return 'roundabout-right';
        return 'roundabout-left';
    }

    // Fork encodes left/right
    if (type === 'fork') {
        if (mod === 'left' || mod === 'slight-left') return 'fork-left';
        return 'fork-right';
    }

    // End of road
    if (type === 'end of road') {
        if (mod === 'left') return 'u-turn-left';
        return 'u-turn-right';
    }

    // continue / new name — add modifier only when it's a directional word
    const directional = new Set(['left', 'right', 'slight-left', 'slight-right', 'sharp-left', 'sharp-right', 'uturn']);
    if (directional.has(mod)) {
        return `${type.replace(/\s+/g, '-')}-${mod}`;
    }

    // Catch-all: just the type, spaces to hyphens
    return type.replace(/\s+/g, '-');
}

// Helper to convert TransportMode to Mapbox profile
function getMapboxProfile(mode: TransportMode): string {
    switch (mode) {
        case TransportMode.WALKING:
            return 'walking';
        case TransportMode.DRIVING:
            return 'driving';
        case TransportMode.TRANSIT:
            return 'walking'; // Mapbox doesn't support transit, fallback to walking
        default:
            return 'walking';
    }
}

// Helper to convert TransportMode to Google Maps travel mode
function getGoogleTravelMode(mode: TransportMode): string {
    switch (mode) {
        case TransportMode.WALKING:
            return 'WALK';
        case TransportMode.DRIVING:
            return 'DRIVE';
        case TransportMode.TRANSIT:
            return 'TRANSIT';
        default:
            return 'WALK';
    }
}

export type DirectionsRequestEvent =
    | { type: 'request-started'; cacheKey: string; request: DirectionsRequest }
    | { type: 'request-success'; cacheKey: string; request: DirectionsRequest }
    | { type: 'request-failed'; cacheKey: string; request: DirectionsRequest; error: unknown }
    | { type: 'request-timeout'; cacheKey: string; request: DirectionsRequest };

const directionsListeners = new Set<(event: DirectionsRequestEvent) => void>();

export function addDirectionsListener(listener: (event: DirectionsRequestEvent) => void): () => void {
    directionsListeners.add(listener);
    return () => directionsListeners.delete(listener);
}

function emitDirectionsEvent(event: DirectionsRequestEvent) {
    directionsListeners.forEach((listener) => listener(event));
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {...init, signal: controller.signal});
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.warn('[Directions] Request timeout', {timeoutMs});
            throw new Error('DirectionsRequestTimeout');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Main function to get directions
export async function getDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    // Ensure cache is initialized
    if (!cacheInitialized) {
        await initializeDirectionsCache();
    }

    const cacheKey = generateCacheKey(request);

    // Check exact cache match first
    if (directionsCache.has(cacheKey)) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return directionsCache.get(cacheKey)!;
    }

    // For transit mode, check for relevant cached routes within time window
    if (request.transportMode === TransportMode.TRANSIT) {
        const relevantCache = findRelevantTransitCache(request);
        if (relevantCache) {
            return relevantCache;
        }
    }

    console.log(`[Cache MISS] ${cacheKey}`);
    emitDirectionsEvent({type: 'request-started', cacheKey, request});

    let response: DirectionsResponse;
    try {
        if (request.provider === Provider.MAPBOX) {
            response = await getMapboxDirections(request);
        } else {
            response = await getGoogleMapsDirections(request);
        }
    } catch (error) {
        if ((error as Error).message === 'DirectionsRequestTimeout') {
            emitDirectionsEvent({type: 'request-timeout', cacheKey, request});
        } else {
            emitDirectionsEvent({type: 'request-failed', cacheKey, request, error});
        }
        throw error;
    }

    emitDirectionsEvent({type: 'request-success', cacheKey, request});

    // Store in cache and persist
    directionsCache.set(cacheKey, response);
    await persistCache();
    return response;
}

async function getMapboxDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const profile = getMapboxProfile(request.transportMode);
    const coordinates = `${request.origin.longitude},${request.origin.latitude};${request.destination.longitude},${request.destination.latitude}`;

    console.log(`[Mapbox API] Fetching directions for ${profile} mode`, {
        origin: request.origin,
        destination: request.destination,
        timeFilter: request.timeFilter
    });

    const params = new URLSearchParams({
        access_token: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '',
        geometries: 'polyline',
        overview: 'full',
        steps: 'true'
    });

    // Add departure or arrival time only for TRANSIT and DRIVING modes
    // Mapbox does not accept milliseconds in the timestamp, so strip them
    const mapboxTimeFilter = request.timeFilter.replace(/\.\d{3}Z$/, 'Z');
    if (request.transportMode === TransportMode.TRANSIT || request.transportMode === TransportMode.DRIVING) {
        if (request.timeFilterMode === 'depart') {
            params.append('depart_at', mapboxTimeFilter);
        } else if (request.timeFilterMode === 'arrive') {
            params.append('arrive_by', mapboxTimeFilter);
        }
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;

    console.log('[Mapbox API] Request URL', url);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
        const errorBody = typeof response.json === 'function' ? await response.json().catch(() => null) : null;
        console.error('[Mapbox API] Error response', response.status, JSON.stringify(errorBody));
        throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    return convertMapboxResponse(data);
}

async function getGoogleMapsDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const body: any = {
        origin: {
            location: {
                latLng: {
                    latitude: request.origin.latitude,
                    longitude: request.origin.longitude
                }
            }
        },
        destination: {
            location: {
                latLng: {
                    latitude: request.destination.latitude,
                    longitude: request.destination.longitude
                }
            }
        },
        travelMode: getGoogleTravelMode(request.transportMode)
    };

    // Add departure or arrival time only for TRANSIT and DRIVING modes
    if (request.transportMode === TransportMode.TRANSIT || request.transportMode === TransportMode.DRIVING) {
        if (request.timeFilterMode === 'depart') {
            body.departureTime = request.timeFilter;
        } else if (request.timeFilterMode === 'arrive') {
            body.arrivalTime = request.timeFilter;
        }
    }

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline,routes.legs.steps'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();
    return convertGoogleMapsResponse(data);
}