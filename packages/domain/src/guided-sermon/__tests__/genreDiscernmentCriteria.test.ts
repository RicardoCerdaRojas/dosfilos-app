import { describe, it, expect } from 'vitest';
import {
    GENRE_DISCERNMENT_CRITERIA,
    GENRE_DISCERNMENT_GENRES,
    genreDiscernmentCriteriaFor,
} from '../genreDiscernmentCriteria';
import { SENTINEL_GENRES, PENDING_AUTHOR_GENRES } from '../../exegesis/expository/BookPanorama';

/**
 * Redacción v2 Fase 1 (§4.4) A3 — la vara de discernimiento de género.
 * Invariante: el catálogo cubre TODO el enum `LiteraryGenre` (si falta un
 * género, el juez queda sin vara para él → adjudicaría libre, violando 036).
 */
const ALL_GENRES = ['epistle', 'narrative', 'parable', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];

// Partición sellada (§11.0) — consumida del SSOT de dominio (BookPanorama), no
// redefinida aquí: predicables AUTORADOS (criterio no vacío) / PENDIENTE (parable
// — vacío temporal, exento) / CENTINELAS (gospel/mixed — string es ruteo, no
// criterio; no se asevera no-vacío).
const PENDING_AUTHOR: readonly string[] = PENDING_AUTHOR_GENRES;
const SENTINELS: readonly string[] = SENTINEL_GENRES;

describe('GENRE_DISCERNMENT_CRITERIA', () => {
    it('cubre exactamente el enum LiteraryGenre (llaves ≡ enum)', () => {
        expect([...GENRE_DISCERNMENT_GENRES].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('predicables autorados: criterio no vacío (pendiente y centinelas exentos)', () => {
        for (const g of GENRE_DISCERNMENT_GENRES) {
            if (PENDING_AUTHOR.includes(g) || SENTINELS.includes(g)) continue;
            expect(GENRE_DISCERNMENT_CRITERIA[g].trim().length).toBeGreaterThan(20);
        }
    });

    it('pendiente (parable): stub vacío VISIBLE — falla al autorarse, forzando quitarlo de PENDING_AUTHOR', () => {
        for (const g of PENDING_AUTHOR) {
            expect(GENRE_DISCERNMENT_CRITERIA[g]).toBe('');
        }
    });

    it('genreDiscernmentCriteriaFor devuelve la marca del género', () => {
        expect(genreDiscernmentCriteriaFor('epistle')).toBe(GENRE_DISCERNMENT_CRITERIA.epistle);
    });

    it('fail-safe: género fuera del enum o ausente → cadena vacía (nunca inventa vara)', () => {
        expect(genreDiscernmentCriteriaFor(undefined)).toBe('');
        expect(genreDiscernmentCriteriaFor('')).toBe('');
        expect(genreDiscernmentCriteriaFor('xyz')).toBe(''); // 'xyz' NO existe en el enum
    });
});
