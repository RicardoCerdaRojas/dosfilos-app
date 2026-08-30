import { describe, expect, it } from 'vitest';
import {
    selectForPrompt,
    sheetWithinRanges,
    type CorpusChunk,
} from '../selectCorpusChunks';

function chunk(
    partial: Partial<CorpusChunk> & { chunkIndex: number },
): CorpusChunk {
    return {
        resourceId: 'libro-a',
        text: 'x'.repeat(1000),
        sheet: partial.chunkIndex,
        section: null,
        score: 0.5,
        ...partial,
    };
}

describe('selectForPrompt', () => {
    it('mete primero lo fijado, aunque no gane el ranking', () => {
        // La introducción del libro no menciona el versículo, así que su puntaje
        // es bajo — y aun así el usuario la marcó.
        const result = selectForPrompt({
            pinned: [chunk({ chunkIndex: 1, score: 0.05 })],
            ranked: [chunk({ chunkIndex: 50, score: 0.9 })],
            budgetChars: 5000,
        });

        expect(result.chunks.map(c => c.chunkIndex)).toEqual([1, 50]);
        expect(result.pinnedChars).toBe(1000);
        expect(result.rankedChars).toBe(1000);
    });

    it('devuelve los fragmentos en orden de documento, no por puntaje', () => {
        // Un comentario se lee corrido: barajarlo por cercanía le entrega al
        // modelo el material desordenado.
        const result = selectForPrompt({
            pinned: [],
            ranked: [
                chunk({ chunkIndex: 30, score: 0.9 }),
                chunk({ chunkIndex: 10, score: 0.7 }),
                chunk({ chunkIndex: 20, score: 0.8 }),
            ],
            budgetChars: 5000,
        });

        expect(result.chunks.map(c => c.chunkIndex)).toEqual([10, 20, 30]);
    });

    it('agrupa por fuente antes que por hoja', () => {
        const result = selectForPrompt({
            pinned: [],
            ranked: [
                chunk({ resourceId: 'libro-b', chunkIndex: 5, sheet: 5 }),
                chunk({ resourceId: 'libro-a', chunkIndex: 90, sheet: 90 }),
            ],
            budgetChars: 5000,
        });

        expect(result.chunks.map(c => c.resourceId)).toEqual(['libro-a', 'libro-b']);
    });

    it('corta el ranking cuando se acaba el presupuesto', () => {
        const result = selectForPrompt({
            pinned: [],
            ranked: [
                chunk({ chunkIndex: 1, score: 0.9 }),
                chunk({ chunkIndex: 2, score: 0.8 }),
                chunk({ chunkIndex: 3, score: 0.7 }),
            ],
            budgetChars: 2000,
        });

        expect(result.chunks.map(c => c.chunkIndex)).toEqual([1, 2]);
        expect(result.droppedRanked).toBe(1);
    });

    it('descarta por puntaje, no por orden de llegada', () => {
        const result = selectForPrompt({
            pinned: [],
            ranked: [
                chunk({ chunkIndex: 1, score: 0.1 }),
                chunk({ chunkIndex: 2, score: 0.9 }),
            ],
            budgetChars: 1000,
        });

        expect(result.chunks.map(c => c.chunkIndex)).toEqual([2]);
    });

    it('avisa cuando lo fijado se come el presupuesto entero', () => {
        // Sin esto, el paso sale pobre y nadie sabe por qué.
        const result = selectForPrompt({
            pinned: [chunk({ chunkIndex: 1 }), chunk({ chunkIndex: 2 })],
            ranked: [chunk({ chunkIndex: 50, score: 0.9 })],
            budgetChars: 2000,
        });

        expect(result.pinnedExhaustedBudget).toBe(true);
        expect(result.droppedRanked).toBe(1);
        expect(result.chunks).toHaveLength(2);
    });

    it('no avisa de presupuesto agotado cuando no había ranking que perder', () => {
        const result = selectForPrompt({
            pinned: [chunk({ chunkIndex: 1 })],
            ranked: [],
            budgetChars: 1000,
        });

        expect(result.pinnedExhaustedBudget).toBe(false);
    });

    it('no cuenta dos veces un fragmento fijado que también ganó el ranking', () => {
        const both = chunk({ chunkIndex: 7, score: 0.95 });
        const result = selectForPrompt({
            pinned: [both],
            ranked: [both],
            budgetChars: 5000,
        });

        expect(result.chunks).toHaveLength(1);
        expect(result.pinnedChars).toBe(1000);
        expect(result.rankedChars).toBe(0);
    });

    it('respeta un presupuesto de cero sin romperse', () => {
        const result = selectForPrompt({
            pinned: [],
            ranked: [chunk({ chunkIndex: 1 })],
            budgetChars: 0,
        });

        expect(result.chunks).toEqual([]);
        expect(result.droppedRanked).toBe(1);
    });
});

describe('sheetWithinRanges', () => {
    it('acepta una hoja dentro de un tramo', () => {
        expect(sheetWithinRanges(70, [{ start: 68, end: 72 }])).toBe(true);
    });

    it('rechaza una hoja que el usuario dejó afuera', () => {
        // Firestore devuelve lo más cercano de TODO el libro; la curaduría manda.
        expect(sheetWithinRanges(300, [{ start: 68, end: 72 }])).toBe(false);
    });

    it('rechaza un fragmento sin hoja conocida', () => {
        expect(sheetWithinRanges(null, [{ start: 1, end: 999 }])).toBe(false);
    });

    it('acepta los extremos del tramo', () => {
        expect(sheetWithinRanges(68, [{ start: 68, end: 72 }])).toBe(true);
        expect(sheetWithinRanges(72, [{ start: 68, end: 72 }])).toBe(true);
    });
});
