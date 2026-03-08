/**
 * Unit tests for buildManeuverKey (and its private helper resolveMapboxRoundaboutKey).
 *
 * File location: services/maps/__tests__/build-maneuver-key.test.ts
 *
 * These are pure-function tests — no mocks, no async, no setup required.
 * Covers all branches of buildManeuverKey (L293-334) and the three branches
 * of resolveMapboxRoundaboutKey (L288-290) in directions-api-adapter.ts.
 */

import { buildManeuverKey } from '@/services/maps/directions-api-adapter';

// ─── Empty / falsy type (L293-294) ───────────────────────────────────────────

describe('empty type', () => {
    it('returns "continue" for an empty string', () => {
        expect(buildManeuverKey('')).toBe('continue');
    });
});

// ─── Standalone types — never need a modifier suffix (L300-301) ──────────────

describe('standalone types', () => {
    it.each(['depart', 'arrive', 'merge', 'notification', 'use lane'])(
        'returns "%s" unchanged regardless of modifier',
        (type) => {
            expect(buildManeuverKey(type, 'left')).toBe(type);
            expect(buildManeuverKey(type)).toBe(type);
        }
    );
});

// ─── turn (L304-306) ─────────────────────────────────────────────────────────

describe('turn', () => {
    it('returns "turn-left" for modifier "left"', () => {
        expect(buildManeuverKey('turn', 'left')).toBe('turn-left');
    });

    it('returns "turn-right" for modifier "right"', () => {
        expect(buildManeuverKey('turn', 'right')).toBe('turn-right');
    });

    it('normalises "slight left" spaces to "turn-slight-left"', () => {
        expect(buildManeuverKey('turn', 'slight left')).toBe('turn-slight-left');
    });

    it('normalises "sharp right" spaces to "turn-sharp-right"', () => {
        expect(buildManeuverKey('turn', 'sharp right')).toBe('turn-sharp-right');
    });

    it('falls back to "turn-right" when no modifier is supplied', () => {
        expect(buildManeuverKey('turn')).toBe('turn-right');
    });
});

// ─── Ramp types — returned as-is (L309) ──────────────────────────────────────

describe('ramp types', () => {
    it('returns "on ramp" unchanged for any modifier', () => {
        expect(buildManeuverKey('on ramp', 'right')).toBe('on ramp');
        expect(buildManeuverKey('on ramp', 'left')).toBe('on ramp');
        expect(buildManeuverKey('on ramp')).toBe('on ramp');
    });

    it('returns "off ramp" unchanged for any modifier', () => {
        expect(buildManeuverKey('off ramp', 'slight right')).toBe('off ramp');
        expect(buildManeuverKey('off ramp')).toBe('off ramp');
    });
});

// ─── Roundabout family — resolveMapboxRoundaboutKey (L288-290, L312-313) ─────

describe('roundabout family', () => {
    // resolveMapboxRoundaboutKey branch: mod === 'left'  (L288)
    it('returns "roundabout-left" for type=roundabout modifier=left', () => {
        expect(buildManeuverKey('roundabout', 'left')).toBe('roundabout-left');
    });

    // resolveMapboxRoundaboutKey branch: mod === 'right'  (L289)
    it('returns "roundabout-right" for type=roundabout modifier=right', () => {
        expect(buildManeuverKey('roundabout', 'right')).toBe('roundabout-right');
    });

    // resolveMapboxRoundaboutKey default branch (L290)
    it('returns "roundabout-left" as default for an unrecognised modifier', () => {
        expect(buildManeuverKey('roundabout', 'straight')).toBe('roundabout-left');
        expect(buildManeuverKey('roundabout')).toBe('roundabout-left');
    });

    it('applies the same logic to type=rotary', () => {
        expect(buildManeuverKey('rotary', 'right')).toBe('roundabout-right');
        expect(buildManeuverKey('rotary', 'left')).toBe('roundabout-left');
    });

    it('applies the same logic to "roundabout turn"', () => {
        expect(buildManeuverKey('roundabout turn', 'left')).toBe('roundabout-left');
    });

    it('applies the same logic to "exit roundabout"', () => {
        expect(buildManeuverKey('exit roundabout', 'right')).toBe('roundabout-right');
    });

    it('applies the same logic to "exit rotary"', () => {
        expect(buildManeuverKey('exit rotary')).toBe('roundabout-left');
    });
});

// ─── Fork (L316-319) ─────────────────────────────────────────────────────────

describe('fork', () => {
    it('returns "fork-left" for modifier "left"', () => {
        expect(buildManeuverKey('fork', 'left')).toBe('fork-left');
    });

    it('returns "fork-left" for modifier "slight left" (spaces normalised)', () => {
        expect(buildManeuverKey('fork', 'slight left')).toBe('fork-left');
    });

    it('returns "fork-right" for modifier "right"', () => {
        expect(buildManeuverKey('fork', 'right')).toBe('fork-right');
    });

    it('returns "fork-right" for modifier "straight" (neither left branch)', () => {
        expect(buildManeuverKey('fork', 'straight')).toBe('fork-right');
    });

    it('returns "fork-right" when no modifier is supplied', () => {
        expect(buildManeuverKey('fork')).toBe('fork-right');
    });
});

// ─── End of road (L322-325) ───────────────────────────────────────────────────

describe('end of road', () => {
    it('returns "u-turn-left" for modifier "left"', () => {
        expect(buildManeuverKey('end of road', 'left')).toBe('u-turn-left');
    });

    it('returns "u-turn-right" for modifier "right"', () => {
        expect(buildManeuverKey('end of road', 'right')).toBe('u-turn-right');
    });

    it('returns "u-turn-right" when no modifier is supplied', () => {
        expect(buildManeuverKey('end of road')).toBe('u-turn-right');
    });
});

// ─── Directional catch-all — modifier appended (L328-331) ────────────────────
// Applies to types like "continue" and "new name" when the modifier is one of
// the recognised directional words.

describe('directional catch-all', () => {
    it('appends "right" to "continue"', () => {
        expect(buildManeuverKey('continue', 'right')).toBe('continue-right');
    });

    it('appends "left" to "continue"', () => {
        expect(buildManeuverKey('continue', 'left')).toBe('continue-left');
    });

    it('appends normalised "slight-left" to "continue"', () => {
        expect(buildManeuverKey('continue', 'slight left')).toBe('continue-slight-left');
    });

    it('appends normalised "sharp-right" to "continue"', () => {
        expect(buildManeuverKey('continue', 'sharp right')).toBe('continue-sharp-right');
    });

    it('appends "uturn" to "continue"', () => {
        expect(buildManeuverKey('continue', 'uturn')).toBe('continue-uturn');
    });

    it('hyphenates "new name" and appends directional modifier', () => {
        expect(buildManeuverKey('new name', 'left')).toBe('new-name-left');
    });

    it('hyphenates "new name" and appends "slight-right"', () => {
        expect(buildManeuverKey('new name', 'slight right')).toBe('new-name-slight-right');
    });
});

// ─── Non-directional catch-all — type only, spaces to hyphens (L334) ─────────

describe('non-directional catch-all', () => {
    it('returns "continue" with no modifier', () => {
        expect(buildManeuverKey('continue')).toBe('continue');
    });

    it('returns "new-name" for "new name" with non-directional modifier "straight"', () => {
        expect(buildManeuverKey('new name', 'straight')).toBe('new-name');
    });

    it('hyphenates an unknown multi-word type', () => {
        expect(buildManeuverKey('push notification')).toBe('push-notification');
    });

    it('returns a single-word unknown type unchanged', () => {
        expect(buildManeuverKey('unknown')).toBe('unknown');
    });
});
