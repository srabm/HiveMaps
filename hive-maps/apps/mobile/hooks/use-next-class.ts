import {useEffect, useState} from 'react';
import {getNextClass, type CalendarEvent, type NextClassResult} from '../services/next-class-parser';

type UseNextClassOptions = {
    events: CalendarEvent[] | null;
    refreshIntervalMs?: number;
    nowProvider?: () => Date;
};

type UseNextClassState = {
    result: NextClassResult;
    lastChecked: Date | null;
};

const defaultNowProvider = () => new Date();

function getEventsDependencyKey(events: CalendarEvent[] | null): string {
    if (!events) {
        return 'null';
    }

    return events
        .map((event) =>
            [
                event.id,
                event.location ?? '',
                event.start.dateTime ?? '',
                event.start.date ?? '',
                event.end.dateTime ?? '',
                event.end.date ?? '',
            ].join('|')
        )
        .join('||');
}

export function useNextClass({
    events,
    refreshIntervalMs = 60 * 1000,
    nowProvider = defaultNowProvider,
}: UseNextClassOptions): UseNextClassState {
    const [result, setResult] = useState<NextClassResult>({status: 'none'});
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const eventsDependencyKey = getEventsDependencyKey(events);

    useEffect(() => {
        const evaluate = () => {
            const now = nowProvider();
            const next = events ? getNextClass(events, now) : {status: 'none'} as const;
            setResult(next);
            setLastChecked(now);
        };

        evaluate();

        if(refreshIntervalMs <= 0) {
            return;
        }

        const timer = setInterval(evaluate, refreshIntervalMs);

        return () => {
            clearInterval(timer);
        };
    }, [eventsDependencyKey, refreshIntervalMs, nowProvider]);

    return {result, lastChecked};
}
