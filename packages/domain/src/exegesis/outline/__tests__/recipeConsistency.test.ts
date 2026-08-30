import { describe, expect, it } from 'vitest';
import { checkRecipeConsistency, sheetFromSourceLocation } from '../recipeConsistency';
import type { ProjectSourceExcerpt, SheetRange } from '../../entities/ProjectSource';

function excerpt(sourceLocation: string): ProjectSourceExcerpt {
    return { text: 'x', sourceLocation, relevanceScore: 1, userEdited: false, editedAt: null };
}

function source(locations: string[], sheetRanges: SheetRange[] | null) {
    return {
        excerpts: locations.map(excerpt),
        excerptRecipe: sheetRanges
            ? { sheetRanges, proposedRanges: [], pinnedRanges: [], passageFingerprint: 'v1|x|' }
            : null,
    };
}

describe('sheetFromSourceLocation', () => {
    it('lee la hoja del ancla completa', () => {
        expect(sheetFromSourceLocation('p. 118, § Escena 4')).toBe(118);
    });

    it('lee la hoja del ancla sin sección', () => {
        expect(sheetFromSourceLocation('p. 7')).toBe(7);
    });

    it('devuelve null cuando el ancla es solo una sección', () => {
        expect(sheetFromSourceLocation('§ Jonah 1:1-3')).toBeNull();
    });

    it('devuelve null con ancla vacía', () => {
        expect(sheetFromSourceLocation('')).toBeNull();
    });
});

describe('checkRecipeConsistency', () => {
    it('acepta una fuente cuyos fragmentos caen en la receta', () => {
        const result = checkRecipeConsistency(
            source(['p. 11', 'p. 15, § A', 'p. 18'], [{ start: 11, end: 18 }]),
        );

        expect(result.consistent).toBe(true);
        expect(result.strayExcerpts).toBe(0);
    });

    it('detecta el caso real: fragmentos de hojas que la receta no declara', () => {
        // Medido en producción: receta 5, 11-18, 105-117, 121-132; guardados
        // fragmentos de la hoja 118, que no está en ningún tramo.
        const result = checkRecipeConsistency(
            source(
                ['p. 17', 'p. 18', 'p. 106', 'p. 118, § Escena 4'],
                [{ start: 5, end: 5 }, { start: 11, end: 18 }, { start: 105, end: 117 }, { start: 121, end: 132 }],
            ),
        );

        expect(result.consistent).toBe(false);
        expect(result.strayExcerpts).toBe(1);
        expect(result.straySheets).toEqual([118]);
    });

    it('no acusa a las fuentes anteriores al selector', () => {
        // Sin receta no hay nada que contradecir.
        expect(checkRecipeConsistency(source(['p. 400'], null)).consistent).toBe(true);
    });

    it('ignora fragmentos sin hoja legible en el ancla', () => {
        // Un documento cuyos chunks no traen página no acusa a nadie.
        const result = checkRecipeConsistency(
            source(['§ solo sección', 'p. 12'], [{ start: 11, end: 18 }]),
        );

        expect(result.consistent).toBe(true);
    });

    it('junta las hojas intrusas sin repetirlas', () => {
        const result = checkRecipeConsistency(
            source(['p. 50', 'p. 50', 'p. 51'], [{ start: 11, end: 18 }]),
        );

        expect(result.strayExcerpts).toBe(3);
        expect(result.straySheets).toEqual([50, 51]);
    });
});
