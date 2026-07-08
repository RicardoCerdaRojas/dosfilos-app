import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed, resolveGenreProvenance, type PastoralSeed } from '../PastoralSeed';
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

describe('ContextGenreStepPolicy.persistTo — provenance (A2, shadow-first)', () => {
    const policy = new ContextGenreStepPolicy();
    const seedWith = (genre: string): PastoralSeed =>
        ({ contextGenre: { genre, genreConfirmed: Boolean(genre), genreImplication: '', bookLocationNote: '', historicalContextConsulted: false, timeSpentSeconds: 0 } }) as PastoralSeed;

    it('book genre + prose names no genre → aiProposed, genre unchanged', () => {
        const patch = policy.persistTo(seedWith('epistle'), 'Reflexión sin nombrar el género literario del pasaje aquí.');
        expect(patch.contextGenre?.genreProvenance).toBe('aiProposed');
        expect(patch.contextGenre?.genre).toBe('epistle');
        expect(patch.contextGenre?.genreOverrideReason).toBeUndefined();
    });

    it('book genre + prose names the SAME genre → userConfirmed', () => {
        const patch = policy.persistTo(seedWith('narrative'), 'Es una narrativa histórica, la leo por el relato.');
        expect(patch.contextGenre?.genreProvenance).toBe('userConfirmed');
        expect(patch.contextGenre?.genre).toBe('narrative');
    });

    it('book genre + prose names a DIFFERENT genre → userOverride, genre NOT swapped (shadow), reason stored', () => {
        const patch = policy.persistTo(seedWith('narrative'), 'Esto en realidad es poesía, puro paralelismo.');
        expect(patch.contextGenre?.genreProvenance).toBe('userOverride');
        expect(patch.contextGenre?.genre).toBe('narrative'); // proposed retained in shadow
        expect(patch.contextGenre?.genreOverrideReason).toContain('poesía');
    });

    it('no book genre + prose names one → userOverride, genre supplied', () => {
        const patch = policy.persistTo(seedWith(''), 'Esto es una carta de Pablo, un argumento sostenido.');
        expect(patch.contextGenre?.genreProvenance).toBe('userOverride');
        expect(patch.contextGenre?.genre).toBe('epistle');
    });
});
