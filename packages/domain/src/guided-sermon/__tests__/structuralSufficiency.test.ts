import { describe, it, expect } from 'vitest';
import {
    STRUCTURAL_SUFFICIENCY_BY_GENRE,
    STRUCTURAL_SUFFICIENCY_GENRES,
    evaluateStructuralSufficiency,
} from '../structuralSufficiency';
import { GENRE_DISCERNMENT_GENRES } from '../genreDiscernmentCriteria';

/**
 * Redacción v2 Fase 1 (§4.5) B1 — vara determinista y tosca del paso 3.
 * Invariante: cubre TODO el enum LiteraryGenre (si falta un género, la vara no
 * lo mide → hueco silencioso).
 */
const ALL_GENRES = ['epistle', 'narrative', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];

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

    it('cada género trae guía no vacía; workedExamples arrancan vacíos (curados por el fundador)', () => {
        for (const g of STRUCTURAL_SUFFICIENCY_GENRES) {
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].guidance.trim().length).toBeGreaterThan(20);
            expect(STRUCTURAL_SUFFICIENCY_BY_GENRE[g].workedExamples).toEqual([]);
        }
    });

    it('gospel y mixed no tienen marcas deterministas (géneros que se disuelven / disparan override)', () => {
        expect(STRUCTURAL_SUFFICIENCY_BY_GENRE.gospel.markers).toEqual([]);
        expect(STRUCTURAL_SUFFICIENCY_BY_GENRE.mixed.markers).toEqual([]);
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
        expect(evaluateStructuralSufficiency('parable', 'La cláusula principal y su argumento.')).toBe('unclear');
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
