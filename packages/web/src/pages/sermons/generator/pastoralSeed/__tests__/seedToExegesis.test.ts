import { describe, it, expect } from 'vitest';
import type { PastoralSeed } from '@dosfilos/domain';
import { seedToExegesis } from '../seedToExegesis';

function seedWith(parallels: PastoralSeed['recognition']['parallels']): PastoralSeed {
    return {
        passage: '2 Pedro 2:10-22',
        wordStudies: { studies: [] },
        insight: { centralIdea: 'idea', observations: [], openQuestion: '', pastoralAnecdote: '', doxologicalApplication: '' },
        structuralAnalysis: { mainClause: { reference: '', pastorNote: 'nota' } },
        function: { originalAudienceFunction: 'función' },
        recognition: { parallels },
    } as unknown as PastoralSeed;
}

describe('seedToExegesis — R3 arrastra los paralelos del pastor (ADR-035)', () => {
    it('lleva recognition.parallels a canonicalParallels (antes se descartaban)', () => {
        const ex = seedToExegesis(seedWith([
            { reference: 'Números 22-24', relevanceNote: 'Balaam', source: 'pastor-suggested' },
            { reference: 'Proverbios 26:11', relevanceNote: 'perro al vómito', source: 'pastor-suggested' },
        ]));
        expect(ex.canonicalParallels).toEqual([
            { reference: 'Números 22-24', relevanceNote: 'Balaam' },
            { reference: 'Proverbios 26:11', relevanceNote: 'perro al vómito' },
        ]);
    });

    it('omite canonicalParallels cuando no hay paralelos', () => {
        const ex = seedToExegesis(seedWith([]));
        expect(ex.canonicalParallels).toBeUndefined();
    });

    it('descarta paralelos sin referencia', () => {
        const ex = seedToExegesis(seedWith([
            { reference: '  ', relevanceNote: 'x', source: 'pastor-suggested' },
            { reference: 'Juan 10:28-29', relevanceNote: 'seguridad', source: 'pastor-suggested' },
        ]));
        expect(ex.canonicalParallels).toEqual([{ reference: 'Juan 10:28-29', relevanceNote: 'seguridad' }]);
    });
});
