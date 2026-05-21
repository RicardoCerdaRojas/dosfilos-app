import { describe, it, expect } from 'vitest';
import { detectIllustrationDuplicates } from '../detectIllustrationDuplicates';
import type { SermonContent } from '../../entities/SermonGenerator';

function draftWithIllustrations(...illustrations: (string | undefined)[]): SermonContent {
    return {
        title: 'Test',
        introduction: '',
        body: illustrations.map((illustration, i) => ({
            point: `Point ${i + 1}`,
            content: '',
            illustration,
        })),
        conclusion: '',
    };
}

describe('detectIllustrationDuplicates', () => {
    it('returns empty when draft is missing', () => {
        expect(detectIllustrationDuplicates(null)).toEqual([]);
        expect(detectIllustrationDuplicates(undefined)).toEqual([]);
    });

    it('returns empty when fewer than two body points', () => {
        expect(detectIllustrationDuplicates(draftWithIllustrations('alone'))).toEqual([]);
    });

    it('returns empty when illustrations are missing or blank', () => {
        expect(
            detectIllustrationDuplicates(draftWithIllustrations(undefined, '', '   ')),
        ).toEqual([]);
    });

    it('flags two near-identical illustrations as duplicates', () => {
        // Same anecdote phrased two slightly different ways.
        const draft = draftWithIllustrations(
            'Un padre que esperaba a su hijo pródigo cada tarde en la entrada del pueblo, mirando hacia el horizonte con esperanza incansable y compasión profunda.',
            'El padre esperaba al hijo pródigo en la entrada del pueblo cada tarde, mirando hacia el horizonte con esperanza inquebrantable y compasión inmensa.',
        );
        const result = detectIllustrationDuplicates(draft);
        expect(result).toHaveLength(1);
        expect(result[0].indexA).toBe(0);
        expect(result[0].indexB).toBe(1);
        expect(result[0].similarity).toBeGreaterThanOrEqual(0.45);
    });

    it('does not flag illustrations from the same broad category but distinct content', () => {
        // Both car-themed but completely different stories.
        const draft = draftWithIllustrations(
            'Una familia conduciendo a través del desierto sin gasolina, esperando un milagro en medio de la noche estrellada y silenciosa.',
            'Un mecánico que reparaba motores antiguos en su taller heredado del padre, transmitiendo el oficio a una nueva generación de aprendices jóvenes.',
        );
        expect(detectIllustrationDuplicates(draft)).toEqual([]);
    });

    it('respects custom threshold', () => {
        const draft = draftWithIllustrations(
            'Un niño construye castillo arena playa observa marea destruye',
            'Una niña construye castillo arena playa observa marea destruye',
        );
        // High threshold suppresses the flag.
        expect(detectIllustrationDuplicates(draft, { threshold: 0.99 })).toEqual([]);
        // Low threshold catches it.
        expect(detectIllustrationDuplicates(draft, { threshold: 0.3 })).toHaveLength(1);
    });

    it('reports all duplicate pairs in a 3-point sermon', () => {
        const dupText = 'pescador en el lago de galilea esperando peces durante la madrugada fría con la red preparada';
        const draft = draftWithIllustrations(dupText, dupText, 'completamente distinto programador depuración código sistema producción');
        const result = detectIllustrationDuplicates(draft);
        expect(result).toEqual([
            { indexA: 0, indexB: 1, similarity: expect.any(Number) },
        ]);
        expect(result[0].similarity).toBeGreaterThanOrEqual(0.99);
    });
});
