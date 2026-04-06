import { fetchIndoorRooms } from '@/services/http/indoor-api';
import { createClassroomSearchAdapter } from '@/services/maps/classroom-search-adapter';
import type { MapsProviderPort } from '@/services/maps/maps-provider';

jest.mock('@/services/http/indoor-api', () => ({
  fetchIndoorRooms: jest.fn(),
}));

const createBaseAdapter = (): jest.Mocked<MapsProviderPort> => ({
  ensureConfigured: jest.fn().mockReturnValue('token'),
  geocode: jest.fn().mockResolvedValue(null),
  search: jest.fn().mockResolvedValue([
    { id: 'mapbox-1', name: 'Hall Building', address: '1455 De Maisonneuve Blvd W' },
  ]),
  retrieve: jest.fn().mockResolvedValue([-73.5789, 45.4971]),
  reverse: jest.fn().mockResolvedValue(null),
  forward: jest.fn().mockResolvedValue(null),
  categorySearch: jest.fn().mockResolvedValue(null),
  defaultStyleURL: '',
});

describe('createClassroomSearchAdapter', () => {
  beforeEach(() => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue([
      {
        id: 'H8.835',
        label: 'Room',
        wheelchairAccessible: true,
        floor: '8',
        building: 'H',
        longitude: -73.57926,
        latitude: 45.49727,
      },
      {
        id: 'H8.841',
        label: 'Room',
        wheelchairAccessible: true,
        floor: '8',
        building: 'H',
        longitude: -73.57915,
        latitude: 45.49738,
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes classroom matches ahead of outdoor search results for indoor-style queries', async () => {
    const adapter = createClassroomSearchAdapter(createBaseAdapter());

    const results = await adapter.search('H8.835', null, 'session');

    expect(fetchIndoorRooms).toHaveBeenCalledWith('H', '8');
    expect(results).toEqual([
      {
        id: 'indoor-room:H8.835',
        name: 'H8.835',
        address: 'Room · Floor 8',
        kind: 'classroom',
        buildingCode: 'H',
        floorId: '8',
        indoorNodeId: 'H8.835',
      },
      {
        id: 'mapbox-1',
        name: 'Hall Building',
        address: '1455 De Maisonneuve Blvd W',
      },
    ]);
  });

  it('supports S-prefixed floors such as MBS2', async () => {
    (fetchIndoorRooms as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'MBS2.210',
          label: 'Room',
          wheelchairAccessible: true,
          floor: 'S2',
          building: 'MB',
          longitude: -73.579,
          latitude: 45.4951,
        },
        {
          id: 'MBS2.330',
          label: 'Room',
          wheelchairAccessible: true,
          floor: 'S2',
          building: 'MB',
          longitude: -73.5788,
          latitude: 45.4952,
        },
      ]);
    const adapter = createClassroomSearchAdapter(createBaseAdapter());

    const results = await adapter.search('MBS2', null, 'session');

    expect(fetchIndoorRooms).toHaveBeenCalledWith('MB', 'S2');
    expect(results).toEqual([
      {
        id: 'indoor-room:MBS2.210',
        name: 'MBS2.210',
        address: 'Room · Floor S2',
        kind: 'classroom',
        buildingCode: 'MB',
        floorId: 'S2',
        indoorNodeId: 'MBS2.210',
      },
      {
        id: 'indoor-room:MBS2.330',
        name: 'MBS2.330',
        address: 'Room · Floor S2',
        kind: 'classroom',
        buildingCode: 'MB',
        floorId: 'S2',
        indoorNodeId: 'MBS2.330',
      },
      {
        id: 'mapbox-1',
        name: 'Hall Building',
        address: '1455 De Maisonneuve Blvd W',
      },
    ]);
  });

  it('returns classroom coordinates for indoor results', async () => {
    const adapter = createClassroomSearchAdapter(createBaseAdapter());

    await adapter.search('H8.835', null, 'session');

    await expect(adapter.retrieve('indoor-room:H8.835', 'session')).resolves.toEqual([-73.57926, 45.49727]);
  });

  it('falls back to the base adapter when the query is not a classroom', async () => {
    const baseAdapter = createBaseAdapter();
    const adapter = createClassroomSearchAdapter(baseAdapter);

    const results = await adapter.search('Hall Building', null, 'session');

    expect(fetchIndoorRooms).not.toHaveBeenCalled();
    expect(results).toEqual([
      { id: 'mapbox-1', name: 'Hall Building', address: '1455 De Maisonneuve Blvd W' },
    ]);
  });
});

// ─── passthrough methods ──────────────────────────────────────────────────────
describe('createClassroomSearchAdapter — passthrough methods', () => {
  it('delegates ensureConfigured to base adapter', () => {
    const base = createBaseAdapter();
    createClassroomSearchAdapter(base).ensureConfigured();
    expect(base.ensureConfigured).toHaveBeenCalledTimes(1);
  });

  it('delegates geocode to base adapter', async () => {
    const base = createBaseAdapter();
    await createClassroomSearchAdapter(base).geocode('1455 De Maisonneuve');
    expect(base.geocode).toHaveBeenCalledWith('1455 De Maisonneuve');
  });

  it('delegates reverse to base adapter', async () => {
    const base = createBaseAdapter();
    await createClassroomSearchAdapter(base).reverse(45.497, -73.578);
    expect(base.reverse).toHaveBeenCalledWith(45.497, -73.578);
  });

  it('delegates forward to base adapter', async () => {
    const base = createBaseAdapter();
    await createClassroomSearchAdapter(base).forward('Hall Building');
    expect(base.forward).toHaveBeenCalledWith('Hall Building');
  });

  it('delegates categorySearch to base adapter', async () => {
    const base = createBaseAdapter();
    await createClassroomSearchAdapter(base).categorySearch('restaurant', [45.497, -73.578], -73.6, 45.4, -73.5, 45.5);
    expect(base.categorySearch).toHaveBeenCalled();
  });

  it('exposes defaultStyleURL from base adapter', () => {
    expect(createClassroomSearchAdapter(createBaseAdapter()).defaultStyleURL).toBe('');
  });
});

// ─── retrieve ─────────────────────────────────────────────────────────────────
describe('createClassroomSearchAdapter — retrieve', () => {
  it('delegates retrieve to base for non-indoor IDs', async () => {
    const base = createBaseAdapter();
    await createClassroomSearchAdapter(base).retrieve('mapbox-123', 'session');
    expect(base.retrieve).toHaveBeenCalledWith('mapbox-123', 'session');
  });

  it('returns null for indoor IDs that were never searched', async () => {
    const base = createBaseAdapter();
    const result = await createClassroomSearchAdapter(base).retrieve('indoor-room:H8.999', 'session');
    expect(result).toBeNull();
    expect(base.retrieve).not.toHaveBeenCalled();
  });
});

// ─── caching ──────────────────────────────────────────────────────────────────
describe('createClassroomSearchAdapter — caching', () => {
  it('calls fetchIndoorRooms only once for the same building+floor', async () => {
    const adapter = createClassroomSearchAdapter(createBaseAdapter());
    await adapter.search('H8.835', null, 's1');
    await adapter.search('H8.841', null, 's2');
    expect(fetchIndoorRooms).toHaveBeenCalledTimes(1);
  });

  it('calls fetchIndoorRooms again for a different floor', async () => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue([]);
    const adapter = createClassroomSearchAdapter(createBaseAdapter());
    await adapter.search('H8.835', null, 's1');
    // Clear call count after first search so we can assert exactly 1 more call
    (fetchIndoorRooms as jest.Mock).mockClear();
    (fetchIndoorRooms as jest.Mock).mockResolvedValue([]);
    await adapter.search('H9.101', null, 's2');
    expect(fetchIndoorRooms).toHaveBeenCalledTimes(1);
    expect(fetchIndoorRooms).toHaveBeenCalledWith('H', '9');
  });
});

// ─── error handling ───────────────────────────────────────────────────────────
describe('createClassroomSearchAdapter — error handling', () => {
  it('returns only outdoor results when fetchIndoorRooms throws', async () => {
    (fetchIndoorRooms as jest.Mock).mockRejectedValue(new Error('Network error'));
    const base = createBaseAdapter();
    (base.search as jest.Mock).mockResolvedValue([
      { id: 'outdoor-1', name: 'Hall Building', address: '1455 De Maisonneuve Blvd W' },
    ]);
    const results = await createClassroomSearchAdapter(base).search('H8.835', null, 'session');
    expect(results).toEqual([
      { id: 'outdoor-1', name: 'Hall Building', address: '1455 De Maisonneuve Blvd W' },
    ]);
  });
});

// ─── filtering and cap ────────────────────────────────────────────────────────
describe('createClassroomSearchAdapter — filtering and cap', () => {
  it('filters indoor rooms by the normalized query string', async () => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue([
      { id: 'H8.835', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.579, latitude: 45.497 },
      { id: 'H8.841', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.579, latitude: 45.497 },
      { id: 'H8.900', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.579, latitude: 45.497 },
    ]);
    const adapter = createClassroomSearchAdapter(createBaseAdapter());
    const results = await adapter.search('H8.8', null, 'session');
    const indoor = results!.filter((r) => r.id.startsWith('indoor-room:'));
    expect(indoor).toHaveLength(2);
    expect(indoor.map((r) => r.name)).toContain('H8.835');
    expect(indoor.map((r) => r.name)).toContain('H8.841');
  });

  it('caps indoor results at 10', async () => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => ({
        id: `H8.${800 + i}`, label: 'Room', wheelchairAccessible: true,
        floor: '8', building: 'H', longitude: -73.579, latitude: 45.497,
      })),
    );
    const adapter = createClassroomSearchAdapter(createBaseAdapter());
    const results = await adapter.search('H8', null, 'session');
    expect(results!.filter((r) => r.id.startsWith('indoor-room:'))).toHaveLength(10);
  });

  it('places indoor results before outdoor results', async () => {
    (fetchIndoorRooms as jest.Mock).mockResolvedValue([
      { id: 'H8.835', label: 'Room', wheelchairAccessible: true, floor: '8', building: 'H', longitude: -73.579, latitude: 45.497 },
    ]);
    const base = createBaseAdapter();
    (base.search as jest.Mock).mockResolvedValue([{ id: 'outdoor-1', name: 'Outdoor Place', address: 'somewhere' }]);
    const adapter = createClassroomSearchAdapter(base);
    const results = await adapter.search('H8.835', null, 'session');
    expect(results![0].id).toBe('indoor-room:H8.835');
    expect(results![1].id).toBe('outdoor-1');
  });
});
