//import type {Coordinates} from "@/services/maps/maps-provider"; //TODO refactor this coordinates type

export interface Coordinate {
    longitude: number;
    latitude: number;
}

export enum TransportMode {
    WALKING,
    TRANSIT,
    DRIVING,
    BIKING
}

export enum Provider {
    MAPBOX,
    GOOGLE_MAPS
}

/**
 * Use this direction request format for both providers
 */
export interface DirectionsRequest {
    origin: Coordinate;
    destination: Coordinate;
    transportMode: TransportMode;
    provider: Provider

}

export interface Step {
    distance: number;
    duration: number;
    instruction: string;
    maneuver: string;
    startLocation: Coordinate;
    endLocation: Coordinate;
    polyline?: string;
}

/**
 * Might have to consider the interpretation of the escape character '\\' when reading the polyline (doubled for tooltip lol it never ends)
 * Converts automatically both provider responses to this universal format 💪
 */
export interface DirectionsResponse {
    distanceMeters: number;
    durationSeconds: number;
    polyline: string;
    steps: Step[];
}

// Google Maps Converter
export function convertGoogleMapsResponse(data: any): DirectionsResponse {
    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: Step[] = leg.steps.map((step: any) => ({
        distance: step.distanceMeters,
        duration: parseInt(step.staticDuration),
        instruction: step.navigationInstruction.instructions,
        maneuver: step.navigationInstruction.maneuver,
        startLocation: {
            latitude: step.startLocation.latLng.latitude,
            longitude: step.startLocation.latLng.longitude
        },
        endLocation: {
            latitude: step.endLocation.latLng.latitude,
            longitude: step.endLocation.latLng.longitude
        },
        polyline: step.polyline.encodedPolyline
    }));

    return {
        distanceMeters: route.distanceMeters,
        durationSeconds: parseInt(route.duration),
        polyline: route.polyline.encodedPolyline,
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
        maneuver: step.maneuver.type,
        startLocation: {
            latitude: step.intersections[0].location[1],
            longitude: step.intersections[0].location[0]
        },
        endLocation: {
            latitude: step.intersections[step.intersections.length - 1].location[1],
            longitude: step.intersections[step.intersections.length - 1].location[0]
        },
        polyline: step.geometry
    }));

    return {
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
        polyline: route.geometry,
        steps
    };
}

// Helper to convert TransportMode to Mapbox profile
function getMapboxProfile(mode: TransportMode): string {
    switch (mode) {
        case TransportMode.WALKING:
            return 'walking';
        case TransportMode.DRIVING:
            return 'driving';
        case TransportMode.BIKING:
            return 'cycling';
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
        case TransportMode.BIKING:
            return 'BICYCLE';
        case TransportMode.TRANSIT:
            return 'TRANSIT';
        default:
            return 'WALK';
    }
}

// Main function to get directions
export async function getDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    if (request.provider === Provider.MAPBOX) {
        return getMapboxDirections(request);
    } else {
        return getGoogleMapsDirections(request);
    }
}

async function getMapboxDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const profile = getMapboxProfile(request.transportMode);
    const coordinates = `${request.origin.longitude},${request.origin.latitude};${request.destination.longitude},${request.destination.latitude}`;

    const params = new URLSearchParams({
        access_token: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '',
        geometries: 'polyline',
        overview: 'full',
        steps: 'true'
    });

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    return convertMapboxResponse(data);
}

async function getGoogleMapsDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const body = {
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

    const response = await fetch(url, {
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
