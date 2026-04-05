import { fetchIndoorRooms, type IndoorNodeResponse } from '@/services/http/indoor-api';
import type { Coordinates, MapLocation, MapsProviderPort } from '@/services/maps/maps-provider';
import type { BuildingPoint } from '@/repositories/campus-repository';

const INDOOR_RESULT_PREFIX = 'indoor-room:';
const CONCORDIA_BUILDING_RESULT_PREFIX = 'concordia-building:';
const MAX_INDOOR_RESULTS = 10;
const MAX_BUILDING_RESULTS = 6;
const MAX_BUILDING_CODE_LENGTH = 4;
const SPECIAL_FLOOR_PREFIX_PATTERN = /^[A-Z]\d/;
const NUMERIC_FLOOR_PREFIX_PATTERN = /^\d/;
const BUILDING_CODE_PATTERN = /^[A-Z]{1,4}$/;

const BUILDING_ALIASES_BY_CODE: Record<string, string[]> = {
  MB: ['JSMB', 'JOHN MOLSON SCHOOL OF BUSINESS'],
};
const BUILDING_STOP_WORDS = new Set([
  'ANNEX',
  'BUILDING',
  'CENTRE',
  'CENTER',
  'COMPLEX',
  'HALL',
  'INTEGRATED',
  'OF',
  'AND',
  'THE',
  'WING',
]);

type ParsedRoomQuery = {
  buildingCode: string;
  floorId: string;
};

function normalizeSearchToken(value: string): string {
  let normalized = '';

  for (const character of value.toUpperCase()) {
    const characterCode = character.codePointAt(0);
    if (characterCode === undefined) continue;

    const isAlphaNumeric =
      (characterCode >= 48 && characterCode <= 57) ||
      (characterCode >= 65 && characterCode <= 90);

    if (isAlphaNumeric) {
      normalized += character;
    }
  }

  return normalized;
}

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

function toConcordiaBuildingResultId(buildingCode: string): string {
  return `${CONCORDIA_BUILDING_RESULT_PREFIX}${buildingCode}`;
}

function isIndoorResultId(id: string): boolean {
  return id.startsWith(INDOOR_RESULT_PREFIX);
}

function isConcordiaBuildingResultId(id: string): boolean {
  return id.startsWith(CONCORDIA_BUILDING_RESULT_PREFIX);
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

function buildBuildingSearchTokens(point: BuildingPoint): string[] {
  const aliases = BUILDING_ALIASES_BY_CODE[point.building.code.toUpperCase()] ?? [];
  const nameParts = point.building.name
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const acronymAllWords = nameParts.map((part) => part[0]).join('');
  const acronymCoreWords = nameParts
    .filter((part) => !BUILDING_STOP_WORDS.has(part))
    .map((part) => part[0])
    .join('');

  return [
    point.building.code,
    point.building.name,
    acronymAllWords,
    acronymCoreWords,
    ...aliases,
    ...point.building.addresses,
  ].filter(Boolean);
}

function scoreBuildingMatch(query: string, point: BuildingPoint): number {
  const normalizedQuery = normalizeSearchToken(query);
  if (!normalizedQuery) return -1;

  let bestScore = -1;
  for (const token of buildBuildingSearchTokens(point)) {
    const normalizedToken = normalizeSearchToken(token);
    if (!normalizedToken) continue;

    if (normalizedToken === normalizedQuery) {
      bestScore = Math.max(bestScore, 500);
      continue;
    }
    if (normalizedToken.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 300);
      continue;
    }
    if (normalizedToken.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 200);
      continue;
    }
    if (normalizedQuery.includes(normalizedToken)) {
      bestScore = Math.max(bestScore, 120);
    }
  }

  return bestScore;
}

function formatBuildingLocation(point: BuildingPoint): MapLocation {
  const primaryAddress = point.building.addresses[0] ?? '';
  return {
    id: toConcordiaBuildingResultId(point.building.code),
    name: point.building.name,
    address: primaryAddress,
  };
}

type BuildingPointsGetter = () => BuildingPoint[];

export function createClassroomSearchAdapter(
  baseAdapter: MapsProviderPort,
  getBuildingPoints: BuildingPointsGetter = () => [],
): MapsProviderPort {
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
              // Try the next plausible building/floor split.
            }
          }
          return [] as MapLocation[];
        })(),
      ]);

      const concordiaBuildingResults = getBuildingPoints()
        .map((point) => ({ point, score: scoreBuildingMatch(query, point) }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score;
          return left.point.building.name.localeCompare(right.point.building.name);
        })
        .slice(0, MAX_BUILDING_RESULTS)
        .map(({ point }) => {
          const result = formatBuildingLocation(point);
          resultCoordinates.set(result.id, point.coordinate);
          return result;
        });

      const seenIds = new Set<string>([
        ...indoorResults.map((result) => normalizeSearchToken(result.name)),
        ...concordiaBuildingResults.map((result) => normalizeSearchToken(`${result.name} ${result.address}`)),
      ]);

      const dedupedOutdoorResults = (outdoorResults ?? []).filter((result) => {
        const normalizedResult = normalizeSearchToken(`${result.name} ${result.address}`);
        if (!normalizedResult) return true;
        if (seenIds.has(normalizedResult)) return false;
        seenIds.add(normalizedResult);
        return true;
      });

      const mergedResults = [...indoorResults, ...concordiaBuildingResults, ...dedupedOutdoorResults];
      return mergedResults;
    },

    async retrieve(id: string, sessionToken: string): Promise<Coordinates | null> {
      if (!isIndoorResultId(id) && !isConcordiaBuildingResultId(id)) {
        return baseAdapter.retrieve(id, sessionToken);
      }

      return resultCoordinates.get(id) ?? null;
    },
  };
}
