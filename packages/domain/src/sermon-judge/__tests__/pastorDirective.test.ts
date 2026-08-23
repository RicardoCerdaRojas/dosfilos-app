import { describe, it, expect } from 'vitest';
import type { HomileticalAnalysis } from '../../entities/SermonGenerator';
import {
    normalizePastorDirective,
    hasPastorDirective,
    applyPastorDirective,
    applyPastorDirectives,
} from '../pastorDirective';

const homiletics = (): HomileticalAnalysis =>
    ({
        homileticalProposition: 'En Jonás 1:1-3, veremos dos realidades del conflicto entre Jonás y Dios que deben guiarnos a la obediencia a Dios.',
        outline: {
            mainPoints: [
                { title: 'I. Dios habla y revela su voluntad (vv. 1-2)', description: 'El pasaje comienza…', scriptureReferences: ['Jonás 1:1-2'] },
                { title: 'II. El hombre desobedece y revela su necedad (v. 3)', description: 'La respuesta…', scriptureReferences: ['Jonás 1:3a'] },
            ],
        },
    }) as HomileticalAnalysis;

describe('normalizePastorDirective — las claves vacías se OMITEN, no se guardan vacías', () => {
    it('devuelve undefined cuando no queda nada', () => {
        expect(normalizePastorDirective(undefined)).toBeUndefined();
        expect(normalizePastorDirective({ emphasis: '   ', exegeticalNotes: ['', '  '] })).toBeUndefined();
    });

    it('omite la clave del énfasis vacío en vez de guardarlo como cadena vacía', () => {
        const r = normalizePastorDirective({ emphasis: '  ', exegeticalNotes: ['personifica a la nave'] });
        expect(r).toEqual({ exegeticalNotes: ['personifica a la nave'] });
        expect('emphasis' in r!).toBe(false);
    });

    it('recorta y descarta notas en blanco, conservando el orden', () => {
        const r = normalizePastorDirective({ exegeticalNotes: ['  primera  ', '', 'segunda'] });
        expect(r).toEqual({ exegeticalNotes: ['primera', 'segunda'] });
    });
});

describe('applyPastorDirective — escribe UN punto sin tocar el resto', () => {
    it('caso real: énfasis en el punto 1 (Jonás)', () => {
        const r = applyPastorDirective(homiletics(), 0, {
            emphasis: 'Dios habla, pero su palabra no es sin propósito: habla para dirigir a su pueblo. Contra la idea de que Dios existe pero no se comunica conmigo.',
        });
        const pts = r.outline!.mainPoints;
        expect(pts[0]!.pastorDirective!.emphasis).toContain('no es sin propósito');
        expect(pts[1]!.pastorDirective).toBeUndefined();
        // No pisa lo que ya había en el punto.
        expect(pts[0]!.description).toBe('El pasaje comienza…');
        expect(pts[0]!.scriptureReferences).toEqual(['Jonás 1:1-2']);
    });

    it('caso real: nota exegética en el punto 2 (Jonás)', () => {
        const r = applyPastorDirective(homiletics(), 1, {
            exegeticalNotes: ['"y pagando su pasaje": el hebreo no dice que sea su pasaje personal, personifica a la nave.'],
        });
        expect(r.outline!.mainPoints[1]!.pastorDirective!.exegeticalNotes).toHaveLength(1);
        expect(r.outline!.mainPoints[0]!.pastorDirective).toBeUndefined();
    });

    it('borrar el texto ELIMINA la clave — no deja el punto marcado para siempre', () => {
        const conDirectiva = applyPastorDirective(homiletics(), 0, { emphasis: 'algo' });
        expect(hasPastorDirective(conDirectiva.outline!.mainPoints[0]!.pastorDirective)).toBe(true);

        const borrada = applyPastorDirective(conDirectiva, 0, { emphasis: '   ' });
        const punto = borrada.outline!.mainPoints[0]!;
        expect(punto.pastorDirective).toBeUndefined();
        // La clave se va del objeto: Firestore rechaza `undefined` en un campo.
        expect('pastorDirective' in punto).toBe(false);
    });

    it('un índice fuera de rango no muta nada', () => {
        const h = homiletics();
        expect(applyPastorDirective(h, 9, { emphasis: 'x' })).toEqual(h);
        expect(applyPastorDirective(h, -1, { emphasis: 'x' })).toEqual(h);
    });
});

describe('applyPastorDirectives — regresión: guardar dos puntos NO pierde el primero', () => {
    it('escribe los dos puntos en una sola pasada', () => {
        // El fallo reportado por el fundador (2026-08-23): escribió énfasis en
        // el punto 1 y en el punto 2, guardó, y sólo sobrevivió el 2. La causa
        // era encadenar la versión singular en un bucle desde React, donde cada
        // llamada partía del mismo estado del render.
        const r = applyPastorDirectives(homiletics(), [
            { index: 0, directive: { emphasis: 'Dios habla con propósito' } },
            {
                index: 1,
                directive: {
                    emphasis: 'Ejemplos de hombres que se hicieron necios resistiendo a Dios',
                    exegeticalNotes: ['"y pagando su pasaje": personifica a la nave'],
                },
            },
        ]);
        const pts = r.outline!.mainPoints;
        expect(pts[0]!.pastorDirective!.emphasis).toBe('Dios habla con propósito');
        expect(pts[1]!.pastorDirective!.emphasis).toContain('necios');
        expect(pts[1]!.pastorDirective!.exegeticalNotes).toHaveLength(1);
    });

    it('el bucle ingenuo pierde escrituras — por eso existe la versión en lote', () => {
        const base = homiletics();
        // Así se comporta encadenar mal desde el estado del render: cada
        // llamada parte de `base`, no del resultado anterior.
        const ingenuo = [
            applyPastorDirective(base, 0, { emphasis: 'uno' }),
            applyPastorDirective(base, 1, { emphasis: 'dos' }),
        ].at(-1)!;
        expect(ingenuo.outline!.mainPoints[0]!.pastorDirective).toBeUndefined();

        const enLote = applyPastorDirectives(base, [
            { index: 0, directive: { emphasis: 'uno' } },
            { index: 1, directive: { emphasis: 'dos' } },
        ]);
        expect(enLote.outline!.mainPoints[0]!.pastorDirective!.emphasis).toBe('uno');
        expect(enLote.outline!.mainPoints[1]!.pastorDirective!.emphasis).toBe('dos');
    });

    it('borrar en lote elimina la clave, y los índices inválidos se ignoran', () => {
        const con = applyPastorDirectives(homiletics(), [
            { index: 0, directive: { emphasis: 'algo' } },
            { index: 1, directive: { emphasis: 'otro' } },
        ]);
        const r = applyPastorDirectives(con, [
            { index: 0, directive: { emphasis: '  ' } },
            { index: 42, directive: { emphasis: 'fuera de rango' } },
        ]);
        expect('pastorDirective' in r.outline!.mainPoints[0]!).toBe(false);
        expect(r.outline!.mainPoints[1]!.pastorDirective!.emphasis).toBe('otro');
    });
});
