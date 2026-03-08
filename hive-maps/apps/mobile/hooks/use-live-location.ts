import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type LiveLocation = {
    longitude: number;
    latitude: number;
    heading: number | null;
    accuracy: number | null;
};

type UseLiveLocationResult = {
    location: LiveLocation | null;
    permissionGranted: boolean;
    error: string | null;
};

/**
 * Streams real-time GPS updates from the device while `enabled` is true.
 * Requests foreground location permission on first use.
 * Stops the watcher automatically when `enabled` becomes false or unmounts.
 */
export function useLiveLocation(enabled: boolean): UseLiveLocationResult {
    const [location, setLocation] = useState<LiveLocation | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
        if (!enabled) {
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
            return;
        }

        let active = true;

        const start = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (!active) return;

                if (status !== 'granted') {
                    setPermissionGranted(false);
                    setError('Location permission denied.');
                    return;
                }

                setPermissionGranted(true);
                setError(null);

                subscriptionRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 2000,
                        distanceInterval: 5,
                    },
                    (pos) => {
                        if (!active) return;
                        setLocation({
                            longitude: pos.coords.longitude,
                            latitude: pos.coords.latitude,
                            heading: pos.coords.heading ?? null,
                            accuracy: pos.coords.accuracy ?? null,
                        });
                    },
                );
            } catch (err) {
                if (!active) return;
                setError('Failed to start location tracking.');
                console.warn('[useLiveLocation]', err);
            }
        };

        start();

        return () => {
            active = false;
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
        };
    }, [enabled]);

    return { location, permissionGranted, error };
}
