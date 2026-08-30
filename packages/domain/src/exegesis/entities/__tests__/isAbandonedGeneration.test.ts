import { describe, it, expect } from 'vitest';
import {
    ABANDONED_GENERATION_AFTER_MS,
    isAbandonedGeneration,
    type ExegeticalStepState,
} from '../ExegeticalStep';

const NOW = new Date('2026-08-30T17:00:00.000Z');

function step(state: ExegeticalStepState, agoMs: number) {
    return { state, updatedAt: new Date(NOW.getTime() - agoMs) };
}

describe('isAbandonedGeneration', () => {
    it('deja girar una generación reciente', () => {
        expect(isAbandonedGeneration(step('generating', 30_000), NOW)).toBe(false);
    });

    it('deja girar hasta el techo del servidor', () => {
        // 9 minutos: el servidor todavía puede estar generando.
        expect(isAbandonedGeneration(step('generating', 540_000), NOW)).toBe(false);
    });

    it('no marca abandono justo en el umbral', () => {
        const exactly = step('generating', ABANDONED_GENERATION_AFTER_MS);
        expect(isAbandonedGeneration(exactly, NOW)).toBe(false);
    });

    it('marca abandono pasado el umbral', () => {
        const past = step('generating', ABANDONED_GENERATION_AFTER_MS + 1);
        expect(isAbandonedGeneration(past, NOW)).toBe(true);
    });

    it('marca abandono en el caso real de producción: tres horas', () => {
        expect(isAbandonedGeneration(step('generating', 3 * 3_600_000), NOW)).toBe(true);
    });

    it('ignora todo estado que no sea generating, por viejo que esté', () => {
        const states: ExegeticalStepState[] = ['pending', 'awaiting-review', 'accepted', 'failed'];
        for (const s of states) {
            expect(isAbandonedGeneration(step(s, 3 * 3_600_000), NOW)).toBe(false);
        }
    });

    it('ante un updatedAt ausente o corrupto, deja girar en vez de cobrar dos veces', () => {
        expect(isAbandonedGeneration({ state: 'generating', updatedAt: undefined as never }, NOW)).toBe(false);
        expect(isAbandonedGeneration({ state: 'generating', updatedAt: new Date(NaN) }, NOW)).toBe(false);
    });

    it('un updatedAt en el futuro no es abandono', () => {
        expect(isAbandonedGeneration(step('generating', -60_000), NOW)).toBe(false);
    });
});
