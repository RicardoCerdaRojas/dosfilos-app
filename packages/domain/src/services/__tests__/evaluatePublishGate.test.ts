/**
 * Tests for the Phase 3 PR 2 (ADR-029 §Q3/Q5) pure publish-gate decision.
 *
 * Policy pinned here:
 *  - pass        → allowed ('pass')
 *  - hard-block  → never allowed, even with a valid override ('hard-block')
 *  - soft-block + no override        → blocked ('soft-block-needs-override')
 *  - soft-block + short justification → blocked ('override-too-short')
 *  - soft-block + valid override      → allowed ('soft-block-overridden')
 */

import { describe, expect, it } from 'vitest';
import { FIDELITY_OVERRIDE_MIN_CHARS } from '../../entities/FidelityReport';
import {
    evaluatePublishGate,
    type PublishOverrideInput,
} from '../evaluatePublishGate';

const validOverride: PublishOverrideInput = {
    reason: 'x'.repeat(FIDELITY_OVERRIDE_MIN_CHARS),
    overriddenBy: 'pastor-1',
    bypassedKind: 'partial',
};

describe('evaluatePublishGate', () => {
    it('allows publish when the gate passes', () => {
        expect(evaluatePublishGate('pass')).toEqual({ allowed: true, reason: 'pass' });
    });

    it('ignores an override when the gate passes', () => {
        expect(evaluatePublishGate('pass', validOverride)).toEqual({
            allowed: true,
            reason: 'pass',
        });
    });

    it('refuses a hard-block with no override', () => {
        expect(evaluatePublishGate('hard-block')).toEqual({
            allowed: false,
            reason: 'hard-block',
        });
    });

    it('refuses a hard-block EVEN with a valid override', () => {
        expect(evaluatePublishGate('hard-block', validOverride)).toEqual({
            allowed: false,
            reason: 'hard-block',
        });
    });

    it('blocks a soft-block when no override is supplied', () => {
        expect(evaluatePublishGate('soft-block')).toEqual({
            allowed: false,
            reason: 'soft-block-needs-override',
        });
    });

    it('blocks a soft-block when the justification is too short', () => {
        const short: PublishOverrideInput = {
            ...validOverride,
            reason: 'x'.repeat(FIDELITY_OVERRIDE_MIN_CHARS - 1),
        };
        expect(evaluatePublishGate('soft-block', short)).toEqual({
            allowed: false,
            reason: 'override-too-short',
        });
    });

    it('treats a whitespace-padded short justification as too short (trims first)', () => {
        const padded: PublishOverrideInput = {
            ...validOverride,
            reason: `   ${'x'.repeat(10)}   `,
        };
        expect(evaluatePublishGate('soft-block', padded)).toEqual({
            allowed: false,
            reason: 'override-too-short',
        });
    });

    it('allows a soft-block with a justification at exactly the minimum length', () => {
        expect(evaluatePublishGate('soft-block', validOverride)).toEqual({
            allowed: true,
            reason: 'soft-block-overridden',
        });
    });
});
