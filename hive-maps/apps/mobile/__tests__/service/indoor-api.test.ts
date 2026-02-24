import {
  fetchBuildingFloors,
  fetchFloorDetails,
  getCampusIdForIndoorBuilding,
  parseIndoorBuildingCode,
} from '@/services/http/indoor-api';

jest.mock('@/services/http/campus-api', () => ({
  getApiBaseUrl: () => 'http://api.test',
}));

describe('indoor-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  it('parses supported building code and rejects unsupported values', () => {
    expect(parseIndoorBuildingCode('h')).toBe('H');
    expect(parseIndoorBuildingCode('CC')).toBe('CC');
    expect(parseIndoorBuildingCode('unknown')).toBeNull();
    expect(parseIndoorBuildingCode(null)).toBeNull();
  });

  it('maps indoor buildings to the correct campus', () => {
    expect(getCampusIdForIndoorBuilding('CC')).toBe('LOY');
    expect(getCampusIdForIndoorBuilding('VL')).toBe('LOY');
    expect(getCampusIdForIndoorBuilding('H')).toBe('SGW');
    expect(getCampusIdForIndoorBuilding('LB')).toBe('SGW');
  });

  it('fetchBuildingFloors requests the right endpoint and sorts by sortOrder', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { id: '2', label: '2nd', sortOrder: 2 },
        { id: '1', label: '1st', sortOrder: 1 },
      ]),
    });

    const result = await fetchBuildingFloors('SGW', 'H');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/api/campuses/SGW/buildings/H/floors',
      expect.any(Object),
    );
    expect(result.map((floor) => floor.id)).toEqual(['1', '2']);
  });

  it('fetchFloorDetails returns null for 404 and throws for other errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(fetchFloorDetails('SGW', 'H', '1')).resolves.toBeNull();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchFloorDetails('SGW', 'H', '1')).rejects.toThrow(
      'Indoor API request failed (500)',
    );
  });

  it('fetchFloorDetails returns parsed floor payload when successful', async () => {
    const payload = {
      buildingCode: 'H',
      floor: { id: '1', label: '1st Floor' },
      planGeometry: { type: 'Polygon', coordinates: [] },
      rooms: { type: 'FeatureCollection', features: [] },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    await expect(fetchFloorDetails('SGW', 'H', 'S2')).resolves.toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/api/campuses/SGW/buildings/H/floors/S2',
      expect.any(Object),
    );
  });
});
