import { buildRouteVisualSegments } from '@/services/maps/route-visuals';

const point = (longitude: number, latitude: number) => ({ longitude, latitude });

describe('buildRouteVisualSegments', () => {
  it('builds a single driving segment when steps are all driving', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 1200,
        durationSeconds: 420,
        polyline: '',
        steps: [
          {
            distance: 400,
            duration: 120,
            instruction: 'Head east',
            maneuver: 'depart',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.57, 45.49),
          },
          {
            distance: 800,
            duration: 300,
            instruction: 'Continue',
            maneuver: 'new name',
            startLocation: point(-73.57, 45.49),
            endLocation: point(-73.56, 45.49),
          },
        ],
      },
      'Drive',
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].color).toBe('#e5a712');
    expect(segments[0].lineDasharray).toBeUndefined();
    expect(segments[0].coordinates).toEqual([
      [-73.58, 45.49],
      [-73.57, 45.49],
      [-73.56, 45.49],
    ]);
  });

  it('creates walk/transit/walk segments for mixed transit routes', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 1800,
        durationSeconds: 960,
        polyline: '',
        steps: [
          {
            distance: 200,
            duration: 150,
            instruction: 'Walk to stop',
            maneuver: 'depart',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.579, 45.491),
          },
          {
            distance: 1200,
            duration: 600,
            instruction: 'Take bus',
            maneuver: 'TRANSIT',
            startLocation: point(-73.579, 45.491),
            endLocation: point(-73.57, 45.495),
            transitDetails: {
              transitLine: { nameShort: '24', color: '#00853F', vehicle: { type: 'BUS' } },
            },
          },
          {
            distance: 400,
            duration: 210,
            instruction: 'Walk to destination',
            maneuver: 'arrive',
            startLocation: point(-73.57, 45.495),
            endLocation: point(-73.568, 45.497),
          },
        ],
      },
      'Transit',
    );

    expect(segments).toHaveLength(3);
    expect(segments[0].lineDasharray).toEqual([2, 2]);
    expect(segments[0].color).toBe('#6B7280');
    expect(segments[1].lineDasharray).toBeUndefined();
    expect(segments[1].color).toBe('#00853F');
    expect(segments[2].lineDasharray).toEqual([2, 2]);
  });

  it('uses rail fallback color when transit line color is missing for rail vehicle', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take metro',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { nameShort: 'Green', vehicle: { type: 'SUBWAY' } },
            },
          },
        ],
      },
      'Transit',
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].color).toBe('#1D4ED8');
  });

  it('falls back to route polyline when no steps are available', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 500,
        durationSeconds: 200,
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        steps: [],
      },
      'Walk',
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].lineDasharray).toEqual([2, 2]);
    expect(segments[0].coordinates).toHaveLength(3);
  });
});

