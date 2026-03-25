import {useEffect, useState} from 'react';
import {getNextClass, type CalendarEvent, type NextClassResult} from '../domain/next-class-parser';

type UseNextClassOptions = {
    events: CalendarEvent[] | null;
    refreshIntervalMs?: number;
    nowProvider?: () => Date;
};

type UseNextClassState = {
    result: NextClassResult;
    lastChecked: Date | null;
};

export function useNextClass({
    events,
    refreshIntervalMs = 60 * 1000,
    nowProvider = () => new Date(),
}: UseNextClassOptions): UseNextClassState {
    const [result, setResult] = useState<NextClassResult>({status: 'none'});
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    useEffect(() => {
        let active = true;

        const evaluate = () => {
            const now = nowProvider();
            const next = events ? getNextClass(events, now) : {status: 'none'} as const;

            if (!active){
                return;
            }
            setResult(next);
            setLastChecked(now);
        };

        evaluate();

        if(refreshIntervalMs <= 0) {
            return () => {
                active = false;
            };
        }

        const timer = setInterval(evaluate, refreshIntervalMs);

        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [events, refreshIntervalMs]);

    return {result, lastChecked};
}