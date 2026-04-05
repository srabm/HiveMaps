import { ROUTE_STYLE_TOKENS } from '@/constants/route-styles';
import type { DirectionsResponse, Step } from '@/services/maps/directions-api-adapter';

type Position = [number, number];

export type NavigationModeLabel = 'Drive' | 'Walk' | 'Transit';

export type RouteVisualSegment = {
  coordinates: Position[];
  color: string;
  lineWidth: number;
  lineDasharray?: number[];
};

type SegmentStyle = {
  color: string;
  lineWidth: number;
  lineDasharray?: number[];
};

const isValidCoordinate = (value: Position | undefined): value is Position =>
  !!value &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]) &&
  Math.abs(value[0]) <= 180 &&
  Math.abs(value[1]) <= 90;

const areCoordinatesEqual = (left: Position, right: Position) =>
  left[0] === right[0] && left[1] === right[1];

const dedupeConsecutiveCoordinates = (points: Position[]): Position[] => {
  if (points.length === 0) return points;

  const deduped: Position[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = deduped[deduped.length - 1];
    if (areCoordinatesEqual(previous, current)) continue;
    deduped.push(current);
  }

  return deduped;
};

const normalizeTransitLineColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  return null;
};

const getTransitVehicleType = (step: Step): string => {
  const vehicleType =
    step.transitDetails?.transitLine?.vehicle?.type ??
    step.transitDetails?.transitLine?.vehicle?.name?.text ??
    step.transitDetails?.transitLine?.vehicle?.name ??
    '';
  return typeof vehicleType === 'string' ? vehicleType.toLowerCase() : '';
};

const isRailTransitVehicle = (step: Step): boolean => {
  const vehicleType = getTransitVehicleType(step);
  return (
    vehicleType.includes('subway') ||
    vehicleType.includes('metro') ||
    vehicleType.includes('rail') ||
    vehicleType.includes('train')
  );
};

const buildDefaultStyle = (mode: NavigationModeLabel): SegmentStyle => {
  if (mode === 'Walk') {
    return {
      color: ROUTE_STYLE_TOKENS.walking.color,
      lineWidth: ROUTE_STYLE_TOKENS.walking.width,
      lineDasharray: [...ROUTE_STYLE_TOKENS.walking.dasharray],
    };
  }

  if (mode === 'Transit') {
    return {
      color: ROUTE_STYLE_TOKENS.walking.color,
      lineWidth: ROUTE_STYLE_TOKENS.walking.width,
      lineDasharray: [...ROUTE_STYLE_TOKENS.walking.dasharray],
    };
  }

  return {
    color: ROUTE_STYLE_TOKENS.driving.color,
    lineWidth: ROUTE_STYLE_TOKENS.driving.width,
  };
};

const buildStyleForStep = (step: Step, mode: NavigationModeLabel): SegmentStyle => {
  if (step.transitDetails) {
    const fallback = isRailTransitVehicle(step)
      ? ROUTE_STYLE_TOKENS.transitRailFallback
      : ROUTE_STYLE_TOKENS.transitBusFallback;
    const lineColor = normalizeTransitLineColor(step.transitDetails?.transitLine?.color) ?? fallback.color;
    return {
      color: lineColor,
      lineWidth: fallback.width,
    };
  }

  return buildDefaultStyle(mode);
};

export const decodePolyline = (encoded: string): Position[] => {
  const points: Position[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
};

const getStepCoordinates = (step: Step): Position[] => {
  const decoded = step.polyline ? decodePolyline(step.polyline) : [];
  const dedupedDecoded = dedupeConsecutiveCoordinates(decoded);
  if (dedupedDecoded.length >= 2) return dedupedDecoded;

  const start: Position = [step.startLocation.longitude, step.startLocation.latitude];
  const end: Position = [step.endLocation.longitude, step.endLocation.latitude];
  const fallback = [start, end].filter((coordinate): coordinate is Position => isValidCoordinate(coordinate));
  return dedupeConsecutiveCoordinates(fallback);
};

const appendMergedCoordinates = (base: Position[], extra: Position[]): Position[] => {
  if (base.length === 0) return dedupeConsecutiveCoordinates(extra);
  if (extra.length === 0) return base;

  const shouldTrimFirst = areCoordinatesEqual(base[base.length - 1], extra[0]);
  const appended = shouldTrimFirst ? [...base, ...extra.slice(1)] : [...base, ...extra];
  return dedupeConsecutiveCoordinates(appended);
};

const mergeCompatibleSegments = (segments: RouteVisualSegment[]): RouteVisualSegment[] => {
  const merged: RouteVisualSegment[] = [];

  segments.forEach((segment) => {
    if (segment.coordinates.length < 2) return;

    const previous = merged[merged.length - 1];
    const canMerge =
      previous &&
      previous.color === segment.color &&
      previous.lineWidth === segment.lineWidth &&
      (previous.lineDasharray?.join(',') ?? '') === (segment.lineDasharray?.join(',') ?? '');

    if (!canMerge) {
      merged.push({
        ...segment,
        coordinates: [...segment.coordinates],
        lineDasharray: segment.lineDasharray ? [...segment.lineDasharray] : undefined,
      });
      return;
    }

    previous.coordinates = appendMergedCoordinates(previous.coordinates, segment.coordinates);
  });

  return merged;
};

const buildFallbackRouteSegment = (
  directions: DirectionsResponse,
  mode: NavigationModeLabel,
): RouteVisualSegment[] => {
  if (!directions.polyline) return [];
  const coordinates = dedupeConsecutiveCoordinates(decodePolyline(directions.polyline));
  if (coordinates.length < 2) return [];
  return [{ ...buildDefaultStyle(mode), coordinates }];
};

export const buildRouteVisualSegments = (
  directions: DirectionsResponse | null | undefined,
  mode: NavigationModeLabel,
): RouteVisualSegment[] => {
  if (!directions) return [];

  const steps = directions.steps ?? [];
  const stepSegments: RouteVisualSegment[] = steps
    .map((step) => {
      const coordinates = getStepCoordinates(step);
      if (coordinates.length < 2) return null;
      return {
        ...buildStyleForStep(step, mode),
        coordinates,
      };
    })
    .filter((segment): segment is RouteVisualSegment => !!segment);

  if (stepSegments.length === 0) {
    return buildFallbackRouteSegment(directions, mode);
  }

  return mergeCompatibleSegments(stepSegments);
};
