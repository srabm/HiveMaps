import { getNumericFloor, resolveTraversalFloorId } from '@/app/indoor/[building]';
import type { FloorSummary } from '@/services/http/indoor-api';

jest.mock('@/components/indoor/floor-plan-viewer', () => ({
  FloorPlanViewer: () => null,
}));

const makeFloor = (id: string, label: string, sortOrder: number): FloorSummary => ({
  id,
  label,
  sortOrder,
});

describe('building floor resolvers', () => {
  describe('getNumericFloor', () => {
    it('returns null for empty or missing values', () => {
      expect(getNumericFloor(null)).toBeNull();
      expect(getNumericFloor(undefined)).toBeNull();
      expect(getNumericFloor('   ')).toBeNull();
    });

    it('extracts the first numeric token from floor text', () => {
      expect(getNumericFloor('L2')).toBe(2);
      expect(getNumericFloor(' Floor 12A ')).toBe(12);
    });

    it('supports negative floor numbers', () => {
      expect(getNumericFloor('B-1')).toBe(-1);
      expect(getNumericFloor('level -3 south wing')).toBe(-3);
    });

    it('returns null when no number is present', () => {
      expect(getNumericFloor('Mezzanine')).toBeNull();
    });
  });

  describe('resolveTraversalFloorId', () => {
    const floors: FloorSummary[] = [
      makeFloor('B1', 'Basement -1', -1),
      makeFloor('1', 'L1', 1),
      makeFloor('M', 'Mezzanine', 2),
      makeFloor('Upper', 'Level 4', 4),
    ];

    it('prefers direct id/label matches (case-insensitive)', () => {
      expect(resolveTraversalFloorId(floors, 'm')).toBe('M');
      expect(resolveTraversalFloorId(floors, 'mezzanine')).toBe('M');
    });

    it('falls back to numeric matching against id and label', () => {
      expect(resolveTraversalFloorId(floors, '-1')).toBe('B1');
      expect(resolveTraversalFloorId(floors, '4')).toBe('Upper');
    });

    it('returns null when no floor can be resolved', () => {
      expect(resolveTraversalFloorId(floors, 'Roof')).toBeNull();
    });
  });
});



