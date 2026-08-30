import { describe, expect, it } from 'vitest';
import { batchRanges } from '../CallableDocumentChunkReader';

/** Fragmentos que cubre una lista de tramos. */
function count(ranges: Array<{ start: number; end: number }>): number {
    return ranges.reduce((n, r) => n + (r.end - r.start + 1), 0);
}

/** Todos los índices que cubre, en orden, para comprobar que no se pierde nada. */
function expand(batches: Array<Array<{ start: number; end: number }>>): number[] {
    const out: number[] = [];
    for (const batch of batches) {
        for (const r of batch) for (let i = r.start; i <= r.end; i++) out.push(i);
    }
    return out;
}

describe('batchRanges', () => {
    it('deja un tramo chico en un solo lote', () => {
        expect(batchRanges([{ start: 10, end: 20 }], 180, 40))
            .toEqual([[{ start: 10, end: 20 }]]);
    });

    it('parte un tramo que solo ya pasa el tope', () => {
        // El caso que rompía: un comentario denso produce cientos de fragmentos
        // seguidos y el servidor rechaza la petición entera.
        const batches = batchRanges([{ start: 0, end: 499 }], 180, 40);

        expect(batches.length).toBe(3);
        expect(batches.every(b => count(b) <= 180)).toBe(true);
        expect(expand(batches)).toHaveLength(500);
    });

    it('no pierde ni duplica un solo fragmento', () => {
        const batches = batchRanges(
            [{ start: 0, end: 199 }, { start: 300, end: 450 }, { start: 900, end: 901 }],
            180,
            40,
        );
        const indices = expand(batches);

        expect(indices).toHaveLength(200 + 151 + 2);
        expect(new Set(indices).size).toBe(indices.length);
        expect(indices).toEqual([...indices].sort((a, b) => a - b));
    });

    it('respeta el tope de tramos por lote', () => {
        // Cuarenta y cinco tramos de un fragmento cada uno: pasan el tope de
        // tramos mucho antes que el de fragmentos.
        const many = Array.from({ length: 45 }, (_, i) => ({ start: i * 10, end: i * 10 }));
        const batches = batchRanges(many, 180, 40);

        expect(batches.length).toBe(2);
        expect(batches.every(b => b.length <= 40)).toBe(true);
        expect(expand(batches)).toHaveLength(45);
    });

    it('devuelve vacío sin tramos', () => {
        expect(batchRanges([], 180, 40)).toEqual([]);
    });
});
