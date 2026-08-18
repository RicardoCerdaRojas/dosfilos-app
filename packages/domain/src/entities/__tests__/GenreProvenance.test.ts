import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed, pronounceGenre, resolveGenreProvenance, type PastoralSeed } from '../PastoralSeed';
import { ContextGenreStepPolicy } from '../../guided-sermon/policies/ContextGenreStepPolicy';

/**
 * Redacción v2 Fase 1 (§4.4) — genre provenance contract (A1, domain pure).
 * The override turn (A2) consumes `resolveGenreProvenance`; these lock its
 * semantics without a use case or LLM.
 */
describe('resolveGenreProvenance', () => {
    it('nothing pronounced yet → aiProposed', () => {
        expect(resolveGenreProvenance('epistle', '')).toBe('aiProposed');
        expect(resolveGenreProvenance('epistle', undefined)).toBe('aiProposed');
        expect(resolveGenreProvenance('epistle', '   ')).toBe('aiProposed');
    });

    it('kept the proposed genre → userConfirmed', () => {
        expect(resolveGenreProvenance('epistle', 'epistle')).toBe('userConfirmed');
    });

    it('confirmation is case/space-insensitive', () => {
        expect(resolveGenreProvenance('Epistle', ' epistle ')).toBe('userConfirmed');
    });

    it('chose a different genre → userOverride', () => {
        expect(resolveGenreProvenance('gospel', 'narrative')).toBe('userOverride');
    });

    it('override even when nothing was proposed', () => {
        expect(resolveGenreProvenance('', 'poetry')).toBe('userOverride');
        expect(resolveGenreProvenance(undefined, 'poetry')).toBe('userOverride');
    });
});

describe('createEmptyPastoralSeed — genre provenance default', () => {
    it('starts aiProposed even when a genre is inferred from the book', () => {
        const seed = createEmptyPastoralSeed({
            id: 's1',
            sermonId: 'sm1',
            userId: 'u1',
            passage: 'Romanos 8:1-4',
            genre: 'epistle',
        });
        expect(seed.contextGenre.genreProvenance).toBe('aiProposed');
        // Back-compat: the completion gate is unchanged in Fase 1 (shadow-first).
        expect(seed.contextGenre.genreConfirmed).toBe(true);
    });
});

describe('pronounceGenre — el ACTO del pastor (0b-B)', () => {
    it('elegir el género propuesto → userConfirmed', () => {
        const act = pronounceGenre({ proposedGenre: 'epistle', chosenGenre: 'epistle' });
        expect(act).toEqual({
            genre: 'epistle',
            genreConfirmed: true,
            genreProvenance: 'userConfirmed',
            genreOverrideTarget: undefined,
        });
    });

    it('elegir otro género → userOverride + target estructurado', () => {
        const act = pronounceGenre({ proposedGenre: 'narrative', chosenGenre: 'poetry' });
        expect(act?.genreProvenance).toBe('userOverride');
        expect(act?.genre).toBe('poetry');
        expect(act?.genreOverrideTarget).toBe('poetry');
    });

    it('propuesta centinela: elegir un predicable es override (el centinela no es género)', () => {
        expect(pronounceGenre({ proposedGenre: 'gospel', chosenGenre: 'narrative' })?.genreProvenance).toBe(
            'userOverride',
        );
        expect(pronounceGenre({ proposedGenre: 'mixed', chosenGenre: 'prophecy' })?.genreProvenance).toBe(
            'userOverride',
        );
    });

    it('sin propuesta del libro, elegir uno sigue siendo un acto → userOverride', () => {
        expect(pronounceGenre({ proposedGenre: undefined, chosenGenre: 'wisdom' })?.genreProvenance).toBe(
            'userOverride',
        );
    });

    it('FAIL-CLOSED: no se puede pronunciar un centinela, un stub ni basura', () => {
        expect(pronounceGenre({ proposedGenre: 'epistle', chosenGenre: 'gospel' })).toBeNull();
        expect(pronounceGenre({ proposedGenre: 'epistle', chosenGenre: 'mixed' })).toBeNull();
        expect(pronounceGenre({ proposedGenre: 'epistle', chosenGenre: 'parable' })).toBeNull();
        expect(pronounceGenre({ proposedGenre: 'epistle', chosenGenre: '' })).toBeNull();
        expect(pronounceGenre({ proposedGenre: 'epistle', chosenGenre: 'no-existe' })).toBeNull();
    });
});

describe('ContextGenreStepPolicy.persistTo — la prosa YA NO decide la procedencia (0b-B)', () => {
    const policy = new ContextGenreStepPolicy();
    const seedWith = (genre: string, genreProvenance?: 'aiProposed' | 'userConfirmed' | 'userOverride'): PastoralSeed =>
        ({ contextGenre: { genre, genreConfirmed: Boolean(genre), genreProvenance, genreImplication: '', bookLocationNote: '', historicalContextConsulted: false, timeSpentSeconds: 0 } }) as PastoralSeed;

    it('sin acto previo → aiProposed, aunque la prosa nombre el MISMO género', () => {
        // Antes de 0b-B esto emitía `userConfirmed` por un match de keywords, sin
        // que el pastor se hubiera pronunciado. Dato falso en la sombra.
        const patch = policy.persistTo(seedWith('narrative'), 'Es una narrativa histórica, la leo por el relato.');
        expect(patch.contextGenre?.genreProvenance).toBe('aiProposed');
        expect(patch.contextGenre?.genre).toBe('narrative');
    });

    it('sin acto previo → aiProposed, aunque la prosa nombre OTRO género', () => {
        const patch = policy.persistTo(seedWith('narrative'), 'Esto en realidad es poesía, puro paralelismo.');
        expect(patch.contextGenre?.genreProvenance).toBe('aiProposed');
        expect(patch.contextGenre?.genreOverrideTarget).toBeUndefined();
        expect(patch.contextGenre?.genreOverrideReason).toBeUndefined();
    });

    it('el acto previo se PRESERVA y el turno solo agrega la implicancia', () => {
        const patch = policy.persistTo(seedWith('poetry', 'userConfirmed'), 'Es poesía: leo el paralelismo, no cronología.');
        expect(patch.contextGenre?.genreProvenance).toBe('userConfirmed');
        expect(patch.contextGenre?.genreImplication).toContain('paralelismo');
    });

    it('tras un override, la prosa del turno queda como RAZÓN del override', () => {
        const patch = policy.persistTo(seedWith('poetry', 'userOverride'), 'La perícopa argumenta, no canta.');
        expect(patch.contextGenre?.genreProvenance).toBe('userOverride');
        expect(patch.contextGenre?.genreOverrideReason).toBe('La perícopa argumenta, no canta.');
    });

    it('fix C intacto: sin género del libro, la prosa todavía RESUELVE el género (no la procedencia)', () => {
        const patch = policy.persistTo(seedWith(''), 'Esto es una carta de Pablo, un argumento sostenido.');
        expect(patch.contextGenre?.genre).toBe('epistle');
        expect(patch.contextGenre?.genreProvenance).toBe('aiProposed');
    });
});
