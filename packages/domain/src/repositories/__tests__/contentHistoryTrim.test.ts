import { describe, it, expect } from 'vitest';
import { trimContentHistory, CONTENT_HISTORY_MAX_VERSIONS } from '../IContentHistoryRepository';

const v = (n: number) => ({
    id: `v${n}`,
    sectionId: 'introduction',
    content: `contenido ${n}`,
    timestamp: `2026-08-23T10:${String(n).padStart(2, '0')}:00.000Z`,
    changeDescription: 'edición',
});

describe('trimContentHistory', () => {
    it('conserva las MÁS RECIENTES, no las primeras', () => {
        // El valor de este historial es deshacer lo último; nadie vuelve doce
        // ediciones atrás.
        const r = trimContentHistory({ introduction: Array.from({ length: 15 }, (_, i) => v(i)) }, 10);
        expect(r.introduction).toHaveLength(10);
        expect(r.introduction![0]!.id).toBe('v5');
        expect(r.introduction!.at(-1)!.id).toBe('v14');
    });

    it('por debajo del tope no toca nada', () => {
        const r = trimContentHistory({ introduction: [v(1), v(2)] }, 10);
        expect(r.introduction).toHaveLength(2);
    });

    it('descarta secciones vacías en vez de guardarlas en blanco', () => {
        const r = trimContentHistory({ introduction: [], body: [v(1)] });
        expect('introduction' in r).toBe(false);
        expect(r.body).toHaveLength(1);
    });

    it('el tope por defecto es el de dominio', () => {
        const r = trimContentHistory({ body: Array.from({ length: 40 }, (_, i) => v(i)) });
        expect(r.body).toHaveLength(CONTENT_HISTORY_MAX_VERSIONS);
    });
});
