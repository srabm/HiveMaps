import {useEffect, useState} from 'react';
import {fetchUpcomingGoogleCalendarEvents} from '@/services/google-calendar';
import type {CalendarEvent} from '@/services/next-class-parser';
import { loadGoogleCalendarSelection, loadGoogleCalendarSession } from '@/storage/auth-storage';

type GoogleCalendarEventsStatus = 'idle' | 'loading' | 'loaded' | 'error';

type UseGoogleCalendarEventsOptions = {
    refreshIntervalMs?: number;
    nowProvider?: () => Date;
};

type UseGoogleCalendarEventsResult = {
    events: CalendarEvent[];
    error: string | null;
    status: GoogleCalendarEventsStatus;
};

const defaultNowProvider = () => new Date();

export function useGoogleCalendarEvents({
    refreshIntervalMs = 60 * 1000,
    nowProvider = defaultNowProvider,
}: UseGoogleCalendarEventsOptions = {}): UseGoogleCalendarEventsResult {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<GoogleCalendarEventsStatus>('idle');

    useEffect(() => {
        let mounted = true;

        const loadEvents = async () => {
            setStatus('loading');
            setError(null);

            try {
                const [session, selection] = await Promise.all([
                    loadGoogleCalendarSession(),
                    loadGoogleCalendarSelection(),
                ]);

                if (!mounted) {
                    return;
                }

                const accessToken = session?.accessToken;
                const selectedCalendarIds = selection?.selectedCalendarIds ?? [];

                if (!accessToken || selectedCalendarIds.length === 0) {
                    setEvents([]);
                    setStatus('loaded');
                    return;
                }

                const nextEvents = await fetchUpcomingGoogleCalendarEvents(
                    accessToken,
                    selectedCalendarIds,
                    nowProvider()
                );

                if (!mounted) {
                    return;
                }

                setEvents(nextEvents);
                setStatus('loaded');
            } catch (loadError: unknown) {
                if (!mounted) {
                    return;
                }

                setEvents([]);
                setError(loadError instanceof Error ? loadError.message : 'Unable to load upcoming Google Calendar events right now.');
                setStatus('error');
            }
        };

        void loadEvents();

        if (refreshIntervalMs <= 0) {
            return () => { mounted = false; };
        }

        const timer = setInterval(() => {
            void loadEvents();
        }, refreshIntervalMs);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [defaultNowProvider, refreshIntervalMs]);

    return {events, error, status};
}