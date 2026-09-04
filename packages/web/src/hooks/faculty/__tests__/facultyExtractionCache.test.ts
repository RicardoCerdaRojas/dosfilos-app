import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Extraction } from '@dosfilos/domain';
import { removeExtractionFromCaches, restoreCaches } from '../facultyExtractionCache';

const extraccion = (id: string) => ({ id, title: `recurso ${id}` } as Extraction);

function clienteConDatos() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['faculty', 'extractions', 'user', 'u1'], [extraccion('a'), extraccion('b')]);
    qc.setQueryData(['faculty', 'extractions', 'project', 'u1', 'p1'], [extraccion('b')]);
    qc.setQueryData(['faculty', 'extractions', 'id', 'u1', 'b'], extraccion('b'));
    qc.setQueryData(['otra', 'cosa'], [extraccion('b')]);
    return qc;
}

describe('removeExtractionFromCaches', () => {
    it('saca la extracción de todas las listas de extracciones', () => {
        const qc = clienteConDatos();
        removeExtractionFromCaches(qc, 'b');

        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1']))
            .toEqual([extraccion('a')]);
        expect(qc.getQueryData(['faculty', 'extractions', 'project', 'u1', 'p1']))
            .toEqual([]);
    });

    it('no toca la consulta de UNA extracción: alguien puede estar leyéndola', () => {
        const qc = clienteConDatos();
        removeExtractionFromCaches(qc, 'b');
        expect(qc.getQueryData(['faculty', 'extractions', 'id', 'u1', 'b'])).toEqual(extraccion('b'));
    });

    it('no toca cachés ajenas', () => {
        const qc = clienteConDatos();
        removeExtractionFromCaches(qc, 'b');
        expect(qc.getQueryData(['otra', 'cosa'])).toEqual([extraccion('b')]);
    });

    it('borrar algo que no está no altera nada', () => {
        const qc = clienteConDatos();
        removeExtractionFromCaches(qc, 'z');
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1']))
            .toEqual([extraccion('a'), extraccion('b')]);
    });
});

describe('restoreCaches', () => {
    it('devuelve las listas a como estaban cuando el servidor rechaza', () => {
        const qc = clienteConDatos();
        const antes = qc.getQueryData(['faculty', 'extractions', 'user', 'u1']);

        const snapshots = removeExtractionFromCaches(qc, 'b');
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1'])).not.toEqual(antes);

        restoreCaches(qc, snapshots);
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1'])).toEqual(antes);
        expect(qc.getQueryData(['faculty', 'extractions', 'project', 'u1', 'p1']))
            .toEqual([extraccion('b')]);
    });
});
