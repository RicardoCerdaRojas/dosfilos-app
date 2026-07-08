import { describe, it, expect } from 'vitest';
import {
    GENRE_DISCERNMENT_CRITERIA,
    GENRE_DISCERNMENT_GENRES,
    genreDiscernmentCriteriaFor,
} from '../genreDiscernmentCriteria';

/**
 * Redacción v2 Fase 1 (§4.4) A3 — la vara de discernimiento de género.
 * Invariante: el catálogo cubre TODO el enum `LiteraryGenre` (si falta un
 * género, el juez queda sin vara para él → adjudicaría libre, violando 036).
 */
const ALL_GENRES = ['epistle', 'narrative', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];

describe('GENRE_DISCERNMENT_CRITERIA', () => {
    it('cubre exactamente el enum LiteraryGenre (llaves ≡ enum)', () => {
        expect([...GENRE_DISCERNMENT_GENRES].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('cada género trae criterio no vacío (vara real, no placeholder)', () => {
        for (const g of GENRE_DISCERNMENT_GENRES) {
            expect(GENRE_DISCERNMENT_CRITERIA[g].trim().length).toBeGreaterThan(20);
        }
    });

    it('genreDiscernmentCriteriaFor devuelve la marca del género', () => {
        expect(genreDiscernmentCriteriaFor('epistle')).toBe(GENRE_DISCERNMENT_CRITERIA.epistle);
    });

    it('fail-safe: género desconocido o ausente → cadena vacía (nunca inventa vara)', () => {
        expect(genreDiscernmentCriteriaFor(undefined)).toBe('');
        expect(genreDiscernmentCriteriaFor('')).toBe('');
        expect(genreDiscernmentCriteriaFor('parable')).toBe(''); // aún no en el enum (Fase 2)
    });
});
