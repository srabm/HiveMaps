import { useCallback, useEffect, useState } from 'react';

import type { CampusId } from '@/types/campus';
import { loadSelectedCampus, saveSelectedCampus } from '@/storage/campus-storage';

export type AppState = {
  campus: CampusId | null;
};

const defaultState: AppState = {
  campus: null,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedCampus = await loadSelectedCampus();
      if (mounted) {
        setState((prev) => ({ ...prev, campus: storedCampus }));
        setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setCampus = useCallback((campus: CampusId) => {
    setState((prev) => ({ ...prev, campus }));
    saveSelectedCampus(campus);
  }, []);

  return { state, setCampus, hydrated };
}
