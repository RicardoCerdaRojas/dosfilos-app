import { describe, it, expect } from 'vitest';
import { PASTORAL_SEED_STEP_ORDER } from '../../entities/PastoralSeed';
import { createGuidedSermonSession } from '../GuidedSermonSession';
import { advance, back, pause, resume, retry, stepIndex } from '../GuidedSermonStateMachine';

function freshSession() {
    return createGuidedSermonSession({
        seedId: 'seed-1',
        passage: 'Juan 1:1',
        now: new Date('2026-05-28T00:00:00Z'),
    });
}

describe('GuidedSermonStateMachine', () => {
    it('starts at the first canonical step with zero attempts', () => {
        const s = freshSession();
        expect(s.currentStep).toBe(PASTORAL_SEED_STEP_ORDER[0]);
        expect(s.status).toBe('active');
        for (const k of PASTORAL_SEED_STEP_ORDER) expect(s.stepAttempts[k]).toBe(0);
    });

    it('advance moves to the next step in canonical order', () => {
        let s = freshSession();
        for (let i = 0; i < PASTORAL_SEED_STEP_ORDER.length - 1; i++) {
            s = advance(s);
            expect(s.currentStep).toBe(PASTORAL_SEED_STEP_ORDER[i + 1]);
            expect(s.status).toBe('active');
        }
    });

    it('advance on the LAST step transitions to completed (not past the end)', () => {
        let s = freshSession();
        for (let i = 0; i < PASTORAL_SEED_STEP_ORDER.length - 1; i++) s = advance(s);
        // currentStep is now the last; advance once more.
        s = advance(s, new Date('2026-05-28T01:00:00Z'));
        expect(s.status).toBe('completed');
        expect(s.completedAt).toBeDefined();
        // currentStep stays on the last (no overflow).
        expect(s.currentStep).toBe(PASTORAL_SEED_STEP_ORDER[PASTORAL_SEED_STEP_ORDER.length - 1]);
    });

    it('retry bumps the attempt counter on the current step ONLY', () => {
        const s0 = freshSession();
        const s1 = retry(s0);
        expect(s1.stepAttempts[s0.currentStep]).toBe(1);
        expect(s1.stepAttempts[PASTORAL_SEED_STEP_ORDER[1]]).toBe(0);
    });

    it('back to an earlier started step is allowed; forward is not', () => {
        let s = freshSession();
        s = retry(s); // start step 0
        s = advance(s); // → step 1
        s = retry(s); // start step 1
        s = advance(s); // → step 2
        const back0 = back(s, PASTORAL_SEED_STEP_ORDER[0]);
        expect(back0.currentStep).toBe(PASTORAL_SEED_STEP_ORDER[0]);
        // Forward jump throws.
        expect(() => back(back0, PASTORAL_SEED_STEP_ORDER[5])).toThrow(/forward/i);
    });

    it('back to a never-attempted step throws', () => {
        const s = freshSession();
        // Attempt step 0, advance to step 1, but step 0 attempts > 0; step 5 was never touched.
        const s1 = advance(retry(s));
        expect(() => back(s1, PASTORAL_SEED_STEP_ORDER[5])).toThrow();
    });

    it('pause + resume toggle status', () => {
        const s = freshSession();
        const p = pause(s);
        expect(p.status).toBe('paused');
        const r = resume(p);
        expect(r.status).toBe('active');
    });

    it('pause on completed is a no-op', () => {
        let s = freshSession();
        for (let i = 0; i < PASTORAL_SEED_STEP_ORDER.length; i++) s = advance(s);
        const p = pause(s);
        expect(p.status).toBe('completed');
    });

    it('stepIndex returns -1 for unknown step', () => {
        expect(stepIndex('reading')).toBe(0);
        expect(stepIndex('insight')).toBe(PASTORAL_SEED_STEP_ORDER.length - 1);
        expect(stepIndex('not-a-step' as never)).toBe(-1);
    });
});
