import { describe, it, expect } from 'vitest';
import { SENTINEL_GENRES } from '../../exegesis/expository/BookPanorama';
import {
    GENRE_SERMON_STRUCTURE,
    GENRE_SERMON_STRUCTURE_GENRES,
    sermonStructureFor,
} from '../genreSermonStructure';
import { evaluatePointAnchoring } from '../pointAnchoring';

const ALL_GENRES = ['epistle', 'narrative', 'parable', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];
const SENTINELS: readonly string[] = SENTINEL_GENRES;

describe('GENRE_SERMON_STRUCTURE', () => {
    it('llaves ≡ enum LiteraryGenre', () => {
        expect([...GENRE_SERMON_STRUCTURE_GENRES].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('cada género predicable trae las CUATRO piezas de §6', () => {
        for (const g of GENRE_SERMON_STRUCTURE_GENRES) {
            if (SENTINELS.includes(g)) continue;
            const e = GENRE_SERMON_STRUCTURE[g]!;
            expect(e.puntos.razon.length, `${g} pieza 1 sin razón`).toBeGreaterThan(20);
            expect(e.fuenteDeLosPuntos.length, `${g} pieza 2`).toBeGreaterThan(20);
            expect(e.realizacionDeLaExplicacion.length, `${g} pieza 3`).toBeGreaterThan(20);
            expect(e.proposicion.nota.length, `${g} pieza 4`).toBeGreaterThan(10);
        }
    });

    it('rangos coherentes: min ≥ 1 y min ≤ max', () => {
        for (const g of GENRE_SERMON_STRUCTURE_GENRES) {
            const e = GENRE_SERMON_STRUCTURE[g];
            if (!e) continue;
            expect(e.puntos.min).toBeGreaterThanOrEqual(1);
            expect(e.puntos.min).toBeLessThanOrEqual(e.puntos.max);
        }
    });

    it('centinelas: `null`, NO un objeto con rangos en cero', () => {
        // Un {min:0,max:0} se leería como "de 0 a 0 puntos" y confrontaría
        // cualquier sermón. `null` dice "no hay estructura acá".
        for (const g of SENTINELS) {
            expect(GENRE_SERMON_STRUCTURE[g as (typeof GENRE_SERMON_STRUCTURE_GENRES)[number]]).toBeNull();
        }
    });

    it('parábola: punto único y resiste la multiplicación', () => {
        const p = GENRE_SERMON_STRUCTURE.parable!;
        expect(p.puntos).toMatchObject({ min: 1, max: 1 });
        expect(p.confrontaMultiplicacion).toBe(true);
        expect(p.proposicion.sustantivo).toBe('singular');
    });

    it('es el ÚNICO género que resiste la multiplicación', () => {
        const otros = GENRE_SERMON_STRUCTURE_GENRES
            .filter(g => g !== 'parable')
            .filter(g => GENRE_SERMON_STRUCTURE[g]?.confrontaMultiplicacion);
        expect(otros).toEqual([]);
    });

    it('sapiencial: la marca ramifica la ESTRUCTURA (único caso con porMarca)', () => {
        expect(sermonStructureFor('wisdom', 'proverbial')!.puntos).toMatchObject({ min: 1, max: 1 });
        expect(sermonStructureFor('wisdom', 'reflexiva')!.puntos).toMatchObject({ min: 2, max: 4 });
        expect(sermonStructureFor('wisdom', 'proverbial')!.proposicion.sustantivo).toBe('singular');
        expect(sermonStructureFor('wisdom', 'reflexiva')!.proposicion.sustantivo).toBe('plural');
    });

    it('poesía: las categorías son marcas SIN override de estructura', () => {
        // Ramifican los elementos internos que el paso 3 busca, no el rango.
        const base = GENRE_SERMON_STRUCTURE.poetry!;
        expect(base.marcas).toContain('lamento');
        expect(base.porMarca).toBeUndefined();
        expect(sermonStructureFor('poetry', 'lamento')!.puntos).toEqual(base.puntos);
    });

    it('una marca desconocida no rompe: cae a la estructura base', () => {
        expect(sermonStructureFor('wisdom', 'xyz')!.puntos).toEqual(GENRE_SERMON_STRUCTURE.wisdom!.puntos);
    });

    it('fail-safe: centinela, ausente o fuera del enum → null (no se inventa estructura)', () => {
        expect(sermonStructureFor('mixed')).toBeNull();
        expect(sermonStructureFor(undefined)).toBeNull();
        expect(sermonStructureFor('xyz')).toBeNull();
    });
});

describe('evaluatePointAnchoring — la vara es cobertura + anclaje, no conteo', () => {
    const epistola = GENRE_SERMON_STRUCTURE.epistle!;

    it('fusionar movimientos afines es FIEL: 2 puntos sobre 4 movimientos', () => {
        const r = evaluatePointAnchoring({
            puntos: [
                { id: 'P1', anclajes: ['M1', 'M2'] },
                { id: 'P2', anclajes: ['M3', 'M4'] },
            ],
            movimientosEstudiados: ['M1', 'M2', 'M3', 'M4'],
            estructura: epistola,
        });
        expect(r.fiel).toBe(true);
        expect(r.cobertura).toMatchObject({ estudiados: 4, cubiertos: 4 });
    });

    it('dividir un movimiento profundo en varios puntos es FIEL', () => {
        const r = evaluatePointAnchoring({
            puntos: [
                { id: 'P1', anclajes: ['M1'] },
                { id: 'P2', anclajes: ['M1'] },
                { id: 'P3', anclajes: ['M2'] },
            ],
            movimientosEstudiados: ['M1', 'M2'],
            estructura: epistola,
        });
        expect(r.fiel).toBe(true);
    });

    it('un punto sin anclaje es G3 crítico: lo puso el predicador, no el texto', () => {
        const r = evaluatePointAnchoring({
            puntos: [{ id: 'P1', anclajes: ['M1'] }, { id: 'P2', anclajes: [] }],
            movimientosEstudiados: ['M1'],
            estructura: epistola,
        });
        expect(r.fiel).toBe(false);
        const h = r.hallazgos.find(x => x.clase === 'punto-sin-anclaje')!;
        expect(h).toMatchObject({ esViolacion: true, severidad: 'critica', refina: 'G3', referencia: 'P2' });
    });

    it('anclar a un movimiento no estudiado aparenta cobertura y se confronta', () => {
        const r = evaluatePointAnchoring({
            puntos: [{ id: 'P1', anclajes: ['M9'] }],
            movimientosEstudiados: ['M1'],
            estructura: epistola,
        });
        const h = r.hallazgos.find(x => x.clase === 'anclaje-fantasma')!;
        expect(h).toMatchObject({ esViolacion: true, severidad: 'critica', referencia: 'P1→M9' });
        // Y el movimiento fantasma NO cuenta como cobertura.
        expect(r.cobertura.cubiertos).toBe(0);
    });

    it('omisión DECLARADA es fiel; la misma omisión sin declarar se confronta', () => {
        const base = {
            puntos: [{ id: 'P1', anclajes: ['M1'] }, { id: 'P2', anclajes: ['M2'] }],
            movimientosEstudiados: ['M1', 'M2', 'M3'],
            estructura: epistola,
        };
        const ciega = evaluatePointAnchoring(base);
        expect(ciega.fiel).toBe(false);
        expect(ciega.hallazgos.find(h => h.clase === 'omision-ciega')).toMatchObject({
            severidad: 'estandar', // se confronta, no se bloquea
            referencia: 'M3',
        });
        expect(ciega.cobertura.omitidosCiegos).toBe(1);

        const declarada = evaluatePointAnchoring({ ...base, omisionesDeclaradas: ['M3'] });
        expect(declarada.fiel).toBe(true);
        expect(declarada.cobertura).toMatchObject({ omitidosDeclarados: 1, omitidosCiegos: 0 });
    });

    it('pasarse del techo es GUÍA de carga, no infidelidad', () => {
        const r = evaluatePointAnchoring({
            puntos: ['M1', 'M2', 'M3', 'M4', 'M5'].map((m, i) => ({ id: `P${i}`, anclajes: [m] })),
            movimientosEstudiados: ['M1', 'M2', 'M3', 'M4', 'M5'],
            estructura: epistola, // techo 4
        });
        const h = r.hallazgos.find(x => x.clase === 'sobre-techo')!;
        expect(h.esViolacion).toBe(false);
        expect(h.severidad).toBeUndefined();
        expect(r.fiel).toBe(true); // sigue siendo fiel: el techo no es límite exegético
    });

    it('parábola con varios puntos: confronta, pero no descalifica', () => {
        const r = evaluatePointAnchoring({
            puntos: [{ id: 'P1', anclajes: ['M1'] }, { id: 'P2', anclajes: ['M1'] }],
            movimientosEstudiados: ['M1'],
            estructura: GENRE_SERMON_STRUCTURE.parable!,
        });
        const h = r.hallazgos.find(x => x.clase === 'multiplicacion-en-parabola')!;
        expect(h.esViolacion).toBe(false);
        expect(h.mensaje).toMatch(/fragmentan la única verdad/);
        expect(r.fiel).toBe(true);
    });

    it('sin estructura (centinela): el anclaje se sigue midiendo, la guía de rango no', () => {
        const r = evaluatePointAnchoring({
            puntos: [{ id: 'P1', anclajes: [] }],
            movimientosEstudiados: ['M1'],
            estructura: null,
        });
        expect(r.hallazgos.some(h => h.clase === 'punto-sin-anclaje')).toBe(true);
        expect(r.hallazgos.some(h => h.clase === 'sobre-techo' || h.clase === 'bajo-piso')).toBe(false);
    });

    it('bosquejo vacío no dispara `bajo-piso` (nada que juzgar todavía)', () => {
        const r = evaluatePointAnchoring({
            puntos: [],
            movimientosEstudiados: [],
            estructura: epistola,
        });
        expect(r.hallazgos.some(h => h.clase === 'bajo-piso')).toBe(false);
    });
});
