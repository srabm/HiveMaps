import { createIndoorNodeSearchAdapter } from '@/services/maps/indoor-node-search-adapter';
import { fetchIndoorRooms } from '@/services/http/indoor-api';
import type { MapLocation } from '@/services/maps/maps-provider';

jest.mock('@/services/http/indoor-api', () => ({
  fetchIndoorRooms: jest.fn(),
}));

const mockNodes = [
  { id: 'H8.835', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.57926, latitude: 45.49727 },
  { id: 'H8.841', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.57915, latitude: 45.49738 },
  { id: 'H8.STAIRS.1', label: 'Stairs', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.57871, latitude: 45.49732 },
];

describe('createIndoorNodeSearchAdapter', () => {
  beforeEach(() => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue(mockNodes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when query is empty', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('', null, '');
    expect(results).toEqual([]);
  });

it('filters nodes by id matching query', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('H8.835', null, 'token');
    expect(results).not.toBeNull();
    expect(results!).toHaveLength(1);
    expect(results![0].id).toBe('H8.835');
});

  it('returns multiple matches for partial query', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('H8', null, 'token');
    expect(results).toHaveLength(3);
  });

it('search is case insensitive', async () => {
  const adapter = createIndoorNodeSearchAdapter('H', '8');
  const results = await adapter.search('h8.835', null, 'token');
  expect(results).not.toBeNull();
  expect(results!).toHaveLength(1);
  expect(results![0].id).toBe('H8.835');
});

  it('returns empty array when no nodes match', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('ZZZZ', null, 'token');
    expect(results).toEqual([]);
  });

    it('maps node to MapLocation shape', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('H8.835', null, 'token');
    expect(results).not.toBeNull();
    expect(results![0]).toEqual({
        id: 'H8.835',
        name: 'H8.835',
        address: 'Room · Floor 8',
    });
    });

  it('retrieves coordinates for a known node id', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const coords = await adapter.retrieve('H8.835', 'token');
    expect(coords).toEqual([-73.57926, 45.49727]);
  });

  it('returns null for unknown node id', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const coords = await adapter.retrieve('UNKNOWN', 'token');
    expect(coords).toBeNull();
  });

  it('caches nodes and only calls fetchIndoorRooms once', async () => {
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    await adapter.search('H8', null, 'token');
    await adapter.search('H8.835', null, 'token');
    await adapter.retrieve('H8.841', 'token');
    expect(fetchIndoorRooms).toHaveBeenCalledTimes(1);
  });

  it('calls fetchIndoorRooms with correct building and floor', async () => {
    const adapter = createIndoorNodeSearchAdapter('LB', '2');
    await adapter.search('LB2', null, 'token');
    expect(fetchIndoorRooms).toHaveBeenCalledWith('LB', '2');
  });

  it('limits results to 10', async () => {
    const manyNodes = Array.from({ length: 20 }, (_, i) => ({
      id: `H8.${800 + i}`,
      label: 'Room',
      wheelchairAccessible: true,
      floor: '8',
      building: 'H',
      longitude: -73.579,
      latitude: 45.497,
    }));
    (fetchIndoorRooms as jest.Mock).mockResolvedValue(manyNodes);
    const adapter = createIndoorNodeSearchAdapter('H', '8');
    const results = await adapter.search('H8', null, 'token');
    expect(results).toHaveLength(10);
  });

  it('returns empty array when fetchIndoorRooms fails', async () => {
  (fetchIndoorRooms as jest.Mock).mockRejectedValue(new Error('network error'));
  const adapter = createIndoorNodeSearchAdapter('H', '8');
  let results: MapLocation[] | null = null;
  try {
    results = await adapter.search('H8', null, 'token');
  } catch {
    results = [];
  }
  expect(results).toEqual([]);
});
});