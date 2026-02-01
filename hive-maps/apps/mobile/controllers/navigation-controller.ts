import { useEffect, useMemo, useState } from 'react';

import { campuses, type CampusId } from '@/constants/campus';
import {
  getBuildingPointsByCampus,
  loadCampusesFromApi,
  type CampusMetaPatch,
  type BuildingPointsProgress,
  type BuildingPoint,
} from '@/repositories/campus-repository';
import { mapboxMapsAdapter } from '@/services/mapbox';
import { useAppState } from '@/state/app-state';

export function useNavigationController() {
  const { state, setCampus, hydrated } = useAppState();
  const [points, setPoints] = useState<BuildingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BuildingPointsProgress>({
    total: 0,
    processed: 0,
    found: 0,
  });
  const [tokenAvailable, setTokenAvailable] = useState(false);
  const [campusPatches, setCampusPatches] = useState<Partial<Record<CampusId, CampusMetaPatch>>>({});

  useEffect(() => {
    const token = mapboxMapsAdapter.ensureConfigured();
    setTokenAvailable(!!token);
    // pre-load campus meta from backend (non-blocking)
    loadCampusesFromApi()
      .then((patches) => setCampusPatches(patches))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!tokenAvailable) return;
    setLoading(true);
    setProgress({ total: 0, processed: 0, found: 0 });
    getBuildingPointsByCampus(state.campus, mapboxMapsAdapter, (p, prog) => {
      if (mounted) {
        setPoints(p);
        setProgress(prog);
        setLoading(prog.processed < prog.total);
      }
    }).then((p) => {
      if (mounted) {
        setPoints(p);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [state.campus, tokenAvailable]);

  const campusMeta = useMemo(() => {
    const base = campuses[state.campus];
    const patch = campusPatches[state.campus];
    return patch ? { ...base, ...patch } : base;
  }, [state.campus, campusPatches]);

  return {
    campus: state.campus,
    setCampus,
    hydrated,
    points,
    loading,
    progress,
    campusMeta,
    tokenAvailable,
    mapsAdapter: mapboxMapsAdapter,
  };
}
