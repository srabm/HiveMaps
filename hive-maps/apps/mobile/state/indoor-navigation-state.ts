import { useEffect, useState } from 'react';

import { loadAccessibleState, saveAccessibleState } from '@/storage/indoor-navigation-storage';

export function useIndoorNavigationState() {
  const [hydrated, setHydrated] = useState(false);
  const [accessible, setAccessible] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
        const stored = await loadAccessibleState();
        if (mounted) {
            setAccessible(stored);
            setHydrated(true);
        }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAccessibleState(accessible);
  }, [accessible]);

  return { accessible, setAccessible, hydrated };
}