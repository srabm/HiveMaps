import { useEffect, useMemo, useState } from 'react';

import {
  getBuildingPointsByCampus,
  loadCampusesFromApi,
  type BuildingPointsProgress,
  type BuildingPoint,
} from '@/repositories/campus-repository';
import { mapboxMapsAdapter } from '@/services/mapbox';
import { useAppState } from '@/state/app-state';
import type { CampusMeta, CampusMetaById } from '@/types/campus';

const DEFAULT_CAMPUS_ID = 'SGW';
const CAMPUS_METADATA_RETRY_DELAY_MS = 5000;

function sortCampusesByPreference(remoteCampuses: CampusMeta[]): CampusMeta[] {
  return [...remoteCampuses].sort((left, right) => {
    if (left.id === DEFAULT_CAMPUS_ID && right.id !== DEFAULT_CAMPUS_ID) return -1;
    if (right.id === DEFAULT_CAMPUS_ID && left.id !== DEFAULT_CAMPUS_ID) return 1;

    const labelComparison = left.label.localeCompare(right.label);
    if (labelComparison !== 0) return labelComparison;

    return left.id.localeCompare(right.id);
  });
}

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
  const [campuses, setCampuses] = useState<CampusMeta[]>([]);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const token = mapboxMapsAdapter.ensureConfigured();
    setTokenAvailable(!!token);

    const loadCampusMetadata = async () => {
      try {
        const remoteCampuses = await loadCampusesFromApi();
        if (!isMounted) return;
        setCampuses(sortCampusesByPreference(remoteCampuses));
        setMetadataError(null);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch campuses:', error);
        setMetadataError('Could not load campus metadata. Please make sure the backend is running.');
        retryTimeout = setTimeout(loadCampusMetadata, CAMPUS_METADATA_RETRY_DELAY_MS);
      }
    };

    loadCampusMetadata();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || campuses.length === 0) return;
    if (state.campus && campuses.some((campus) => campus.id === state.campus)) return;

    const fallbackCampusId = campuses.find((campus) => campus.id === DEFAULT_CAMPUS_ID)?.id ?? campuses[0].id;
    setCampus(fallbackCampusId);
  }, [campuses, hydrated, setCampus, state.campus]);

  const campusMetaById = useMemo<CampusMetaById>(() => {
    return campuses.reduce<CampusMetaById>((acc, campus) => {
      acc[campus.id] = campus;
      return acc;
    }, {});
  }, [campuses]);

  const campusMeta = useMemo(() => {
    if (!state.campus) return null;
    return campusMetaById[state.campus] ?? null;
  }, [campusMetaById, state.campus]);

  useEffect(() => {
    let mounted = true;
    if (!tokenAvailable || !state.campus || !campusMeta) return;

    setLoading(true);
    setBuildingsError(null);
    setProgress({ total: 0, processed: 0, found: 0 });

  const allCampusIds = campuses.map(c => c.id);
  // NOTE: use campuses.map(c => c.id) — NOT Object.keys(campuses)
  // because campuses is now a CampusMeta[] array (not a Record), per main's refactor

  const pointsMap: Partial<Record<string, BuildingPoint[]>> = {};
  const mergePoints = () => (Object.values(pointsMap) as BuildingPoint[][]).flat();

  const promises = allCampusIds.map((campusId) =>
      getBuildingPointsByCampus(campusId, mapboxMapsAdapter, (p, prog) => {
          if (!mounted) return;
          pointsMap[campusId] = p;
          setPoints(mergePoints());
          setProgress(prog);
          setLoading(prog.processed < prog.total);
      })
      .then((p) => {
          if (!mounted) return;
          pointsMap[campusId] = p;
      })
      .catch((error) => {
          if (!mounted) return;
          console.error(`Failed to fetch buildings for ${campusId}:`, error);
          pointsMap[campusId] = [];
          setBuildingsError('Could not load buildings from the backend.');
      })
  );

  Promise.all(promises).then(() => {
      if (!mounted) return;
      setPoints(mergePoints());
      setLoading(false);
  });

      return () => {
        mounted = false;
      };
    }, [campusMeta, state.campus, tokenAvailable]);

  return {
    campus: state.campus,
    setCampus,
    hydrated,
    campuses,
    campusMetaById,
    points,
    loading,
    progress,
    campusMeta,
    tokenAvailable,
    mapsAdapter: mapboxMapsAdapter,
    error: metadataError ?? buildingsError,
  };
}