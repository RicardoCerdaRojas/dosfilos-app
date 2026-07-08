import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed, resolveGenreProvenance } from '../PastoralSeed';

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
