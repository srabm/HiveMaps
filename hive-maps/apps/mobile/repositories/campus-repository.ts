import { buildingsByCampus, type CampusMeta, type Building, type CampusId } from '@/constants/campus';
import type { MapsProviderPort } from '@/services/maps/maps-provider';
import { fetchBuildings, fetchCampuses, searchPlaceByAddress, fetchPlaceDetails } from '@/services/http/campus-api';
import { mergeBuildingCache, loadBuildingCache, loadDetailsCache, mergeDetailsCache } from '@/storage/campus-storage';

export type BuildingPoint = {
  id: string;
  building: Building;
  coordinate: [number, number];
  details?: string;
};

export type BuildingPointsProgress = {
  total: number;
  processed: number;
  found: number;
};

export type CampusMetaPatch = Pick<CampusMeta, 'center' | 'zoom' | 'label' | 'name'>;

function cacheKey(building: Building) {
  const rawKey = `${building.code}:${building.addresses[0]}`;
  return rawKey.trim().toLowerCase();
}

export async function loadCampusesFromApi(): Promise<Partial<Record<CampusId, CampusMetaPatch>>> {
  const remote = await fetchCampuses();
  const patches: Partial<Record<CampusId, CampusMetaPatch>> = {};
  remote.forEach((c) => {
    patches[c.id] = {
      center: [c.center.lon, c.center.lat],
      zoom: c.zoom,
      label: c.label,
      name: c.name,
    };
  });
  return patches;
}

export async function getBuildingPointsByCampus(
  campus: CampusId,
  mapsProvider: MapsProviderPort,
  onProgress?: (points: BuildingPoint[], progress: BuildingPointsProgress) => void,
): Promise<BuildingPoint[]> {
  const buildingCache = await loadBuildingCache();
  const detailsCache = await loadDetailsCache();

  let campusBuildings: Building[];
  try {
    campusBuildings = await fetchBuildings(campus);
    console.log(`Using API buildings for ${campus}: ${campusBuildings.length} buildings`);
  } catch {
    // fallback to bundled constants if backend unreachable
    console.log('Using fallback campus.ts buildings');
    campusBuildings = buildingsByCampus[campus];
  }

  const total = campusBuildings.length;
  const updates: Record<string, [number, number]> = {};
  const resolved: BuildingPoint[] = [];
  const missing: Building[] = [];

  let processed = 0;
  let found = 0;

  for (const building of campusBuildings) {
    const key = cacheKey(building);
    let coordinate = buildingCache[key];

    if (coordinate) {
      resolved.push({ id: building.code, building, coordinate });
      processed += 1;
      found += 1;
    } else {
      missing.push(building);
    }
  }

  onProgress?.(resolved, { total, processed, found });

  // Geocode missing buildings with a small concurrency limit so we can show markers progressively.
  const MAX_CONCURRENCY = 5;
  let cursor = 0;

  async function worker() {
    while (cursor < missing.length) {
      const building = missing[cursor++];
      const key = cacheKey(building);
      const addr = building.addresses[0] ?? '';
      // The canonical dataset already includes "Montreal, QC, Canada" for most entries.
      const query = /canada/i.test(addr) ? addr : `${addr}, Montreal, QC, Canada`;
      const geocoded = await mapsProvider.geocode(query);
      processed += 1;
      if (geocoded) {
        updates[key] = geocoded;
        found += 1;
        resolved.push({ id: building.code, building, coordinate: geocoded });
      }
      onProgress?.([...resolved], { total, processed, found });
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, missing.length) }, () => worker());
  await Promise.all(workers);

  if (Object.keys(updates).length) {
    await mergeBuildingCache(updates);
  }

  // update missing details with a concurrency limit
  const newDetailsUpdates: Record<string, any> = {};
  let detailsCursor = 0;
  const DETAILS_CONCURRENCY = 3;

  async function detailsWorker() {
    while (detailsCursor < resolved.length) {
      const point = resolved[detailsCursor++];
      const key = cacheKey(point.building);

      if (detailsCache[key]) {
        point.details = detailsCache[key];
        continue;
      }

      try {
        const placeId = await searchPlaceByAddress(point.building.addresses[0]);
        if (placeId) {
          const details = await fetchPlaceDetails(placeId);
          if (details) {
            point.details = details;
            newDetailsUpdates[key] = details;
            onProgress?.([...resolved], { total, processed: total, found: resolved.length });
          }
        }
      } catch (error){
        console.error(`Failed to fetch place details for ${point.building.code}:`, error);
      }
    }
  }

  await Promise.all(
    Array.from({length: Math.min(DETAILS_CONCURRENCY, resolved.length)}, detailsWorker)
  );

  if (Object.keys(newDetailsUpdates).length > 0) {
    await mergeDetailsCache(newDetailsUpdates);
  }
  console.log('Finished fetching and caching place details');
  return resolved;
}
