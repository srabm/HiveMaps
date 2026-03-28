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
