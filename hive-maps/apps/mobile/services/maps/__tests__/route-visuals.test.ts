import { buildRouteVisualSegments } from '@/services/maps/route-visuals';

const point = (longitude: number, latitude: number) => ({ longitude, latitude });

describe('buildRouteVisualSegments', () => {
  it('returns empty segments when directions are missing', () => {
    expect(buildRouteVisualSegments(null, 'Drive')).toEqual([]);
    expect(buildRouteVisualSegments(undefined, 'Walk')).toEqual([]);
  });

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

  it('normalizes transit color without # and falls back on invalid values', () => {
    const normalized = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take bus',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { nameShort: '24', color: '00853F', vehicle: { type: 'BUS' } },
            },
          },
        ],
      },
      'Transit',
    );

    const fallback = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take bus',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { nameShort: '24', color: 'blue', vehicle: { type: 'BUS' } },
            },
          },
        ],
      },
      'Transit',
    );

    expect(normalized[0].color).toBe('#00853F');
    expect(fallback[0].color).toBe('#2563EB');
  });

  it('uses nested vehicle names to detect rail fallback color', () => {
    const byNameText = buildRouteVisualSegments(
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
              transitLine: { vehicle: { name: { text: 'Metro' } } },
            },
          },
        ],
      },
      'Transit',
    );

    const byName = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take train',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { vehicle: { name: 'Train' } },
            },
          },
        ],
      },
      'Transit',
    );

    expect(byNameText[0].color).toBe('#1D4ED8');
    expect(byName[0].color).toBe('#1D4ED8');
  });

  it('uses rail fallback when vehicle type is RAIL', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take rail',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { vehicle: { type: 'RAIL' } },
            },
          },
        ],
      },
      'Transit',
    );

    expect(segments[0].color).toBe('#1D4ED8');
  });

  it('falls back to bus color for blank or non-string transit colors', () => {
    const blankColor = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take bus',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { color: '   ', vehicle: {} },
            },
          },
        ],
      },
      'Transit',
    );

    const nonStringColor = buildRouteVisualSegments(
      {
        distanceMeters: 900,
        durationSeconds: 400,
        polyline: '',
        steps: [
          {
            distance: 900,
            duration: 400,
            instruction: 'Take bus',
            maneuver: 'TRANSIT',
            startLocation: point(-73.58, 45.49),
            endLocation: point(-73.56, 45.5),
            transitDetails: {
              transitLine: { color: 123 as any, vehicle: {} },
            },
          },
        ],
      },
      'Transit',
    );

    expect(blankColor[0].color).toBe('#2563EB');
    expect(nonStringColor[0].color).toBe('#2563EB');
  });

  it('uses step polyline coordinates and drops invalid step coordinates', () => {
    const polylineStep = buildRouteVisualSegments(
      {
        distanceMeters: 500,
        durationSeconds: 200,
        polyline: '',
        steps: [
          {
            distance: 500,
            duration: 200,
            instruction: 'Follow the path',
            maneuver: 'depart',
            polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            startLocation: point(0, 0),
            endLocation: point(0, 0),
          },
        ],
      },
      'Drive',
    );

    const invalidStep = buildRouteVisualSegments(
      {
        distanceMeters: 500,
        durationSeconds: 200,
        polyline: '',
        steps: [
          {
            distance: 500,
            duration: 200,
            instruction: 'Bad coordinate step',
            maneuver: 'depart',
            startLocation: point(300, 100),
            endLocation: point(400, 120),
          },
        ],
      },
      'Walk',
    );

    expect(polylineStep[0].coordinates).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
    expect(invalidStep).toEqual([]);
  });

  it('returns empty when there are no steps and no fallback route polyline', () => {
    const segments = buildRouteVisualSegments(
      {
        distanceMeters: 500,
        durationSeconds: 200,
        polyline: '',
        steps: [],
      },
      'Walk',
    );

    expect(segments).toEqual([]);
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
