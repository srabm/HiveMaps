import { fetchIndoorRooms, type IndoorNodeResponse } from '@/services/http/indoor-api';
import type { Coordinates, MapLocation, MapsProviderPort } from '@/services/maps/maps-provider';

const INDOOR_RESULT_PREFIX = 'indoor-room:';
const ROOM_QUERY_PATTERN = /^([A-Za-z]{1,4})(\d[\w.-]*)$/;
const MAX_INDOOR_RESULTS = 10;

type ParsedRoomQuery = {
  buildingCode: string;
  floorId: string;
};

function parseRoomQuery(query: string): ParsedRoomQuery | null {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, '');
  if (!normalized) return null;

  const match = normalized.match(ROOM_QUERY_PATTERN);
  if (!match) return null;

  const [, buildingCode, floorAndRoom] = match;
  const floorMatch = floorAndRoom.match(/^(\d+)/);
  if (!floorMatch) return null;

  return {
    buildingCode,
    floorId: floorMatch[1],
  };
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
      const parsedQuery = parseRoomQuery(query);
      const normalizedQuery = query.trim().toLowerCase();

      const [outdoorResults, indoorResults] = await Promise.all([
        baseAdapter.search(query, coordinates, sessionToken),
        parsedQuery
          ? getIndoorRooms(parsedQuery.buildingCode, parsedQuery.floorId)
              .then((rooms) =>
                rooms
                  .filter((room) => room.id.toLowerCase().includes(normalizedQuery))
                  .slice(0, MAX_INDOOR_RESULTS)
                  .map((room) => {
                    const result = formatIndoorLocation(room);
                    resultCoordinates.set(result.id, [room.longitude, room.latitude]);
                    return result;
                  }),
              )
              .catch(() => [] as MapLocation[])
          : Promise.resolve([] as MapLocation[]),
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