import { describe, it, expect } from 'vitest';
import {
    assessIndexCoverage,
    describeIndexCoverage,
    isMarkerOnlyMarkdown,
} from '../indexCoverage';

describe('assessIndexCoverage', () => {
    it('detecta el caso Wallace: 433 páginas indexadas de 711', () => {
        const coverage = assessIndexCoverage([1, 200, 433], 711)!;
        expect(coverage.lastIndexedPage).toBe(433);
        expect(coverage.complete).toBe(false);
        expect(Math.round(coverage.ratio * 100)).toBe(61);
    });

    it('da por completo el índice al que le falta el colofón', () => {
        expect(assessIndexCoverage([1, 700], 711)!.complete).toBe(true);
    });

    it('sin pageCount devuelve null en vez de inventar un denominador', () => {
        expect(assessIndexCoverage([1, 50], null)).toBeNull();
        expect(assessIndexCoverage([1, 50], 0)).toBeNull();
    });

    it('sin páginas válidas devuelve null', () => {
        expect(assessIndexCoverage([], 711)).toBeNull();
        expect(assessIndexCoverage([0, -3], 711)).toBeNull();
    });
});

describe('describeIndexCoverage', () => {
    it('nombra las dos páginas y dice qué se perdió', () => {
        const aviso = describeIndexCoverage(assessIndexCoverage([1, 433], 711))!;
        expect(aviso).toContain('433');
        expect(aviso).toContain('711');
        expect(aviso).toContain('61%');
    });

    it('calla cuando el índice cubre el libro', () => {
        expect(describeIndexCoverage(assessIndexCoverage([1, 711], 711))).toBeNull();
        expect(describeIndexCoverage(null)).toBeNull();
    });
});

describe('isMarkerOnlyMarkdown', () => {
    it('reconoce los 711 rótulos sin texto que LlamaParse devolvió', () => {
        const soloMarcadores = Array.from({ length: 711 }, (_, i) => `<!-- page: ${i + 1} -->`).join('\n');
        expect(isMarkerOnlyMarkdown(soloMarcadores)).toBe(true);
    });

    it('no confunde un libro real con uno vacío', () => {
        const conTexto = Array.from({ length: 10 }, (_, i) =>
            `<!-- page: ${i + 1} -->\n\nLa construcción anartra carga el adjetivo con fuerza cualitativa en este contexto.`,
        ).join('\n\n');
        expect(isMarkerOnlyMarkdown(conTexto)).toBe(false);
    });

    it('un markdown sin marcadores no es asunto suyo', () => {
        expect(isMarkerOnlyMarkdown('Texto sin rótulos de página.')).toBe(false);
        expect(isMarkerOnlyMarkdown('')).toBe(false);
    });
});
