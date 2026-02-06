import { PolygonUtils } from '@/domain/PolygonUtils';

describe('isPointInRing', () => {
  it('point in square', () => {
    const point: [number, number] = [2.1223, 3]
    const ring: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(true);
  });

  it('point outside of square', () => {
    const point: [number, number] = [-2.1223, 3]
    const ring: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(false);
  });

  it('empty ring', () => {
    const point: [number, number] = [0, 3]
    const ring: [number, number][] = []
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(false);
  });

  it('single point ring', () => {
    const point: [number, number] = [0, 0]
    const ring: [number, number][] = [
      [0, 0]
    ];
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(false);
  });

  it('point outside concave ring', () => {
    const point: [number, number] = [4, 1];
    const ring: [number, number][] = [
      [0, 0],
      [4, 4],
      [8, 0],
      [4, 2],
    ];
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(false);
  });

  it('point inside concave ring', () => {
    const point: [number, number] = [4, 3];
    const ring: [number, number][] = [
      [0, 0],
      [4, 4],
      [8, 0],
      [4, 2],
    ];
    expect(PolygonUtils.isPointInRing(point, ring)).toBe(true);
  });
});

describe('isPointInPolygon', () => {
  it('point in square', () => {
    const point: [number, number] = [2.1223, 3]
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(true);
  });

  it('point outside of square', () => {
    const point: [number, number] = [-2.1223, 3]
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]
    ]
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(false);
  });

  it('empty polygon', () => {
    const point: [number, number] = [-2.1223, 3]
    const coordinates: [number, number][][] = []
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(false);
  });

  it('point inside hole (polygon with hole)', () => {
    const point: [number, number] = [0, 0]
    const coordinates: [number, number][][] = [
      [
        [-100, 0],
        [-75, 75],
        [0, 100],
        [75, 75],
        [100, 0],
        [75, -75],
        [0, -100],
        [-75, -75],
      ],
      [
        [-10, 10],
        [10, 10],
        [10, -10],
        [-10, -10],
      ]
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(false);
  });

  it('point inside polygon (polygon with hole)', () => {
    const point: [number, number] = [60, 60]
    const coordinates: [number, number][][] = [
      [
        [-100, 0],
        [-75, 75],
        [0, 100],
        [75, 75],
        [100, 0],
        [75, -75],
        [0, -100],
        [-75, -75],
      ],
      [
        [-10, 10],
        [10, 10],
        [10, -10],
        [-10, -10],
      ]
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(true);
  });

  it('point outside concave polygon', () => {
    const point: [number, number] = [4, 1];
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [4, 4],
        [8, 0],
        [4, 2],
      ],
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(false);
  });

  it('point inside concave polygon', () => {
    const point: [number, number] = [4, 3];
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [4, 4],
        [8, 0],
        [4, 2],
      ],
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(true);
  });

  it('point inside polygon (polygon with multiple holes)', () => {
    const point: [number, number] = [50, 50];
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      [
        [20, 20],
        [40, 20],
        [40, 40],
        [20, 40],
      ],
      [
        [60, 20],
        [80, 20],
        [80, 40],
        [60, 40],
      ],
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(true);
  });

  it('point inside hole (polygon with multiple holes)', () => {
    const point: [number, number] = [30, 30];
    const coordinates: [number, number][][] = [
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      [
        [20, 20],
        [40, 20],
        [40, 40],
        [20, 40],
      ],
      [
        [60, 20],
        [80, 20],
        [80, 40],
        [60, 40],
      ],
    ];
    expect(PolygonUtils.isPointInPolygon(point, coordinates)).toBe(false);
  });
});