/**
 * Tests for state/indoor-route-handoff.ts
 * File location: __tests__/state/indoor-route-handoff.test.ts
 *
 * Uses jest.isolateModules() to get a fresh copy of the module's
 * state for each test without needing --experimental-vm-modules.
 */

import {
    markOriginIndoorSessionCompleted,
    consumeCompletedOriginIndoorSession,
    markDestinationIndoorSessionCompleted,
    consumeCompletedDestinationIndoorSession,
} from '@/state/indoor-route-handoff';

// Each test operates on a fresh require of the module so module-level
// variables (completedOriginSessionId / completedDestinationSessionId)
// are reset between tests.
function freshHandoff() {
    let mod: typeof import('@/state/indoor-route-handoff');
    jest.isolateModules(() => {
        mod = require('@/state/indoor-route-handoff');
    });
    return mod!;
}

describe('indoor-route-handoff — origin session', () => {
    it('returns false when no origin session has been marked', () => {
        const { consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        expect(consume('session-abc')).toBe(false);
    });

    it('returns false for a null origin session id', () => {
        const { consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        expect(consume(null)).toBe(false);
    });

    it('returns true after the matching origin session is marked completed', () => {
        const { markOriginIndoorSessionCompleted: mark, consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        mark('session-1');
        expect(consume('session-1')).toBe(true);
    });

    it('returns false on a second consume of the same origin session', () => {
        const { markOriginIndoorSessionCompleted: mark, consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        mark('session-1');
        consume('session-1');
        expect(consume('session-1')).toBe(false);
    });

    it('returns false when origin session id does not match', () => {
        const { markOriginIndoorSessionCompleted: mark, consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        mark('session-A');
        expect(consume('session-B')).toBe(false);
    });
});

describe('indoor-route-handoff — destination session', () => {
    it('returns false when no destination session has been marked', () => {
        const { consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        expect(consume('session-xyz')).toBe(false);
    });

    it('returns false for a null destination session id', () => {
        const { consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        expect(consume(null)).toBe(false);
    });

    it('returns true after the matching destination session is marked completed', () => {
        const { markDestinationIndoorSessionCompleted: mark, consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        mark('dest-1');
        expect(consume('dest-1')).toBe(true);
    });

    it('returns false on a second consume of the same destination session', () => {
        const { markDestinationIndoorSessionCompleted: mark, consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        mark('dest-1');
        consume('dest-1');
        expect(consume('dest-1')).toBe(false);
    });

    it('returns false when destination session id does not match', () => {
        const { markDestinationIndoorSessionCompleted: mark, consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        mark('dest-A');
        expect(consume('dest-B')).toBe(false);
    });
});

describe('indoor-route-handoff — origin and destination are independent', () => {
    it('marking origin does not satisfy a destination consume', () => {
        const { markOriginIndoorSessionCompleted: mark, consumeCompletedDestinationIndoorSession: consume } = freshHandoff();
        mark('shared-id');
        expect(consume('shared-id')).toBe(false);
    });

    it('marking destination does not satisfy an origin consume', () => {
        const { markDestinationIndoorSessionCompleted: mark, consumeCompletedOriginIndoorSession: consume } = freshHandoff();
        mark('shared-id');
        expect(consume('shared-id')).toBe(false);
    });
});