import type { MapsProviderPort, MapLocation, Coordinates } from '@/services/maps/maps-provider';
import { fetchIndoorRooms, type IndoorNodeResponse } from '@/services/http/indoor-api';

export function createIndoorNodeSearchAdapter(
  buildingCode: string,
): MapsProviderPort {
  let cache: IndoorNodeResponse[] | null = null;

  async function getNodes(): Promise<IndoorNodeResponse[]> {
    if (cache) return cache;
    cache = await fetchIndoorRooms(buildingCode);
    return cache;
  }

  return {
    defaultStyleURL: '',
    ensureConfigured: () => '',
    geocode: async () => null,
    reverse: async () => null,
    forward: async () => null,
    categorySearch: async () => null,

    async search(query: string, _coordinates: Coordinates | null, _sessionToken: string): Promise<MapLocation[] | null> {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      const nodes = await getNodes();
      return nodes
        .filter((n) => n.id.toLowerCase().includes(q))
        .slice(0, 10)
        .map((n) => ({
          id: n.id,
          name: n.id,
          address: `${n.label} · Floor ${n.floor}`,
        }));
    },

    async retrieve(id: string, _sessionToken: string): Promise<Coordinates | null> {
      const nodes = await getNodes();
      const node = nodes.find((n) => n.id === id);
      if (!node) return null;
      return [node.longitude, node.latitude];
    },
  };
}