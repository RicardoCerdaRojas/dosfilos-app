import { describe, it, expect } from 'vitest';
import {
    STRUCTURAL_SUFFICIENCY_BY_GENRE,
    STRUCTURAL_SUFFICIENCY_GENRES,
    evaluateStructuralSufficiency,
} from '../structuralSufficiency';
import { GENRE_DISCERNMENT_GENRES } from '../genreDiscernmentCriteria';
import { SENTINEL_GENRES, PENDING_AUTHOR_GENRES } from '../../exegesis/expository/BookPanorama';

/**
 * Redacción v2 Fase 1 (§4.5) B1 — vara determinista y tosca del paso 3.
 * Invariante: cubre TODO el enum LiteraryGenre (si falta un género, la vara no
 * lo mide → hueco silencioso).
 */
const ALL_GENRES = ['epistle', 'narrative', 'parable', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];

// Partición sellada (§11.0) — consumida del SSOT de dominio (BookPanorama), no
// redefinida aquí: predicables AUTORADOS (guía no vacía) / PENDIENTE (parable —
// vacío temporal, exento) / CENTINELAS (rutean al override; markers []).
const PENDING_AUTHOR: readonly string[] = PENDING_AUTHOR_GENRES;
const SENTINELS: readonly string[] = SENTINEL_GENRES;

describe('STRUCTURAL_SUFFICIENCY_BY_GENRE', () => {
    // NOTA: la garantía DURA de "llaves ≡ enum" es el TIPO Record<LiteraryGenre,…>:
    // agregar/quitar un valor del enum LiteraryGenre rompe la compilación (tsc)
    // aquí si el catálogo no se actualiza. Este test es el espejo legible en
    // runtime — falla si las llaves divergen de la lista canónica.
    it('cubre exactamente el enum LiteraryGenre (llaves ≡ enum) — falla si se agrega/quita una llave', () => {
        expect([...STRUCTURAL_SUFFICIENCY_GENRES].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('el conjunto de géneros coincide con el otro catálogo-dato (GENRE_DISCERNMENT) — un solo conjunto', () => {
        expect([...STRUCTURAL_SUFFICIENCY_GENRES].sort()).toEqual([...GENRE_DISCERNMENT_GENRES].sort());
    });

    it('predicables autorados: guía no vacía (pendiente y centinelas exentos); workedExamples vacíos en todos', () => {
        for (const g of STRUCTURAL_SUFFICIENCY_GENRES) {
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].workedExamples).toEqual([]);
            if (PENDING_AUTHOR.includes(g) || SENTINELS.includes(g)) continue;
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].guidance.trim().length).toBeGreaterThan(20);
        }
    });

    it('centinelas (gospel/mixed) no producen estructura derivable (markers: [])', () => {
        for (const g of SENTINELS) {
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].markers).toEqual([]);
        }
    });

    it('pendiente (parable): stub vacío VISIBLE — falla al autorarse, forzando quitarlo de PENDING_AUTHOR (no deuda silenciosa)', () => {
        for (const g of PENDING_AUTHOR) {
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].guidance).toBe('');
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].markers).toEqual([]);
        }
    });
});

describe('evaluateStructuralSufficiency — determinista, tosca, fail-closed', () => {
    it('nota con marca del género → suficiente (mide EXISTENCIA de análisis, no calidad)', () => {
        expect(evaluateStructuralSufficiency('epistle', 'La cláusula principal es v.1; "por tanto" encadena el argumento.')).toBe('suficiente');
        expect(evaluateStructuralSufficiency('narrative', 'La tensión arranca en la escena del conflicto y resuelve al final.')).toBe('suficiente');
        expect(evaluateStructuralSufficiency('poetry', 'El paralelismo antitético contrasta los dos versos.')).toBe('suficiente');
    });

    it('marca insensible a acentos', () => {
        expect(evaluateStructuralSufficiency('narrative', 'El climax de la escena.')).toBe('suficiente');
        expect(evaluateStructuralSufficiency('narrative', 'El clímax de la escena.')).toBe('suficiente');
    });

    it('contenido sin marca del género → insuficiente', () => {
        expect(evaluateStructuralSufficiency('epistle', 'Este pasaje me parece muy bonito y edificante para la iglesia.')).toBe('insuficiente');
    });

    // Cada rama fail-closed → unclear, por separado.
    it('fail-closed: género fuera del enum (sin vara) → unclear', () => {
        expect(evaluateStructuralSufficiency('xyz', 'La cláusula principal y su argumento.')).toBe('unclear');
    });

    it('fail-closed: parable (en el enum, markers vacías por autorar) → unclear aunque la nota traiga marcas', () => {
        expect(evaluateStructuralSufficiency('parable', 'la escena y el argumento por tanto')).toBe('unclear');
    });

    it('fail-closed: género ausente (undefined) → unclear', () => {
        expect(evaluateStructuralSufficiency(undefined, 'algo estructural')).toBe('unclear');
    });

    it('fail-closed: nota vacía / solo espacios → unclear', () => {
        expect(evaluateStructuralSufficiency('epistle', '')).toBe('unclear');
        expect(evaluateStructuralSufficiency('epistle', '   ')).toBe('unclear');
    });

    it('fail-closed: mixed (sin marcas deterministas) → unclear aunque la nota traiga marcas de otros géneros', () => {
        expect(evaluateStructuralSufficiency('mixed', 'por tanto escena paralelismo climax')).toBe('unclear');
    });

    it('fail-closed: gospel (disuelto) → unclear aunque la nota traiga marcas', () => {
        expect(evaluateStructuralSufficiency('gospel', 'la escena y el relato del arco narrativo')).toBe('unclear');
    });
});
