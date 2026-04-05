import { fetchIndoorRooms, type IndoorNodeResponse } from '@/services/http/indoor-api';
import type { Coordinates, MapLocation, MapsProviderPort } from '@/services/maps/maps-provider';

const INDOOR_RESULT_PREFIX = 'indoor-room:';
const MAX_INDOOR_RESULTS = 10;
const MAX_BUILDING_CODE_LENGTH = 4;
const BUILDING_CODE_PATTERN = /^[A-Z]{1,4}$/;
const SPECIAL_FLOOR_PREFIX_PATTERN = /^[A-Z]\d/;
const NUMERIC_FLOOR_PREFIX_PATTERN = /^\d/;

type ParsedRoomQuery = {
  buildingCode: string;
  floorId: string;
};

function extractFloorId(suffix: string): string | null {
  const specialFloorMatch = /^(S\d+)/.exec(suffix);
  if (specialFloorMatch) return specialFloorMatch[1];

  const numericFloorMatch = /^(\d+)/.exec(suffix);
  if (numericFloorMatch) return numericFloorMatch[1];

  return null;
}

function parseRoomQueryCandidates(query: string): ParsedRoomQuery[] {
  const normalized = query.trim().toUpperCase().replaceAll(' ', '').replaceAll('-', '');
  if (!normalized) return [];

  const candidates = new Map<string, ParsedRoomQuery & { score: number }>();
  const maxBuildingCodeLength = Math.min(MAX_BUILDING_CODE_LENGTH, normalized.length - 1);

  for (let buildingCodeLength = 1; buildingCodeLength <= maxBuildingCodeLength; buildingCodeLength += 1) {
    const buildingCode = normalized.slice(0, buildingCodeLength);
    if (!BUILDING_CODE_PATTERN.test(buildingCode)) continue;
    const suffix = normalized.slice(buildingCodeLength);
    if (!suffix) continue;

    const floorId = extractFloorId(suffix);
    if (!floorId) continue;

    const score = SPECIAL_FLOOR_PREFIX_PATTERN.test(suffix)
      ? 2
      : NUMERIC_FLOOR_PREFIX_PATTERN.test(suffix)
        ? 1
        : 0;
    const candidateKey = `${buildingCode}:${floorId}`;
    const existing = candidates.get(candidateKey);

    if (!existing || score > existing.score) {
      candidates.set(candidateKey, { buildingCode, floorId, score });
    }
  }

  return [...candidates.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.buildingCode.length !== left.buildingCode.length) {
        return right.buildingCode.length - left.buildingCode.length;
      }
      return right.floorId.length - left.floorId.length;
    })
    .map(({ buildingCode, floorId }) => ({ buildingCode, floorId }));
}

function toIndoorResultId(nodeId: string): string {
  return `${INDOOR_RESULT_PREFIX}${nodeId}`;
}

function isIndoorResultId(id: string): boolean {
  return id.startsWith(INDOOR_RESULT_PREFIX);
}

function formatIndoorLocation(node: IndoorNodeResponse): MapLocation {
  return {
    id: toIndoorResultId(node.id),
    name: node.id,
    address: `${node.label} · Floor ${node.floor}`,
    kind: 'classroom',
    buildingCode: node.building,
    floorId: node.floor,
    indoorNodeId: node.id,
  };
}

export function createClassroomSearchAdapter(baseAdapter: MapsProviderPort): MapsProviderPort {
  const roomCache = new Map<string, IndoorNodeResponse[]>();
  const resultCoordinates = new Map<string, Coordinates>();

  async function getIndoorRooms(buildingCode: string, floorId: string): Promise<IndoorNodeResponse[]> {
    const cacheKey = `${buildingCode}:${floorId}`;
    const cached = roomCache.get(cacheKey);
    if (cached) return cached;

    const rooms = await fetchIndoorRooms(buildingCode, floorId);
    roomCache.set(cacheKey, rooms);
    return rooms;
  }

  return {
    defaultStyleURL: baseAdapter.defaultStyleURL,
    ensureConfigured: () => baseAdapter.ensureConfigured(),
    geocode: (address: string) => baseAdapter.geocode(address),
    reverse: (latitude: number, longitude: number) => baseAdapter.reverse(latitude, longitude),
    forward: (address: string) => baseAdapter.forward(address),
    categorySearch: (...args: Parameters<typeof baseAdapter.categorySearch>) => baseAdapter.categorySearch(...args),

    async search(query: string, coordinates: Coordinates | null, sessionToken: string): Promise<MapLocation[] | null> {
      const parsedQueries = parseRoomQueryCandidates(query);
      const normalizedQuery = query.trim().toLowerCase();

      const [outdoorResults, indoorResults] = await Promise.all([
        baseAdapter.search(query, coordinates, sessionToken),
        (async () => {
          for (const parsedQuery of parsedQueries) {
            try {
              const rooms = await getIndoorRooms(parsedQuery.buildingCode, parsedQuery.floorId);
              const matches = rooms
                .filter((room) => room.id.toLowerCase().includes(normalizedQuery))
                .slice(0, MAX_INDOOR_RESULTS)
                .map((room) => {
                  const result = formatIndoorLocation(room);
                  resultCoordinates.set(result.id, [room.longitude, room.latitude]);
                  return result;
                });

              if (matches.length > 0) return matches;
            } catch {
              // Fall through to the next plausible building/floor split.
            }
          }

          return [] as MapLocation[];
        })(),
      ]);

      const mergedResults = [...indoorResults, ...(outdoorResults ?? [])];
      return mergedResults;
    },

    async retrieve(id: string, sessionToken: string): Promise<Coordinates | null> {
      if (!isIndoorResultId(id)) {
        return baseAdapter.retrieve(id, sessionToken);
      }

      return resultCoordinates.get(id) ?? null;
    },
  };
}
