import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
    removeFromCachedLists,
    restoreCaches,
    updateInCachedLists,
} from '../optimisticListCache';

interface Fila { id: string; title: string }

const fila = (id: string, title = `recurso ${id}`): Fila => ({ id, title });
const CLAVE = ['faculty', 'extractions'] as const;

function clienteConDatos() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['faculty', 'extractions', 'user', 'u1'], [fila('a'), fila('b')]);
    qc.setQueryData(['faculty', 'extractions', 'project', 'u1', 'p1'], [fila('b')]);
    qc.setQueryData(['faculty', 'extractions', 'id', 'u1', 'b'], fila('b'));
    qc.setQueryData(['otra', 'cosa'], [fila('b')]);
    return qc;
}

describe('removeFromCachedLists', () => {
    it('saca el elemento de todas las listas bajo la clave', () => {
        const qc = clienteConDatos();
        removeFromCachedLists<Fila>(qc, CLAVE, f => f.id === 'b');

        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1'])).toEqual([fila('a')]);
        expect(qc.getQueryData(['faculty', 'extractions', 'project', 'u1', 'p1'])).toEqual([]);
    });

    it('no toca la consulta de UN elemento: alguien puede estar leyéndola', () => {
        const qc = clienteConDatos();
        removeFromCachedLists<Fila>(qc, CLAVE, f => f.id === 'b');
        expect(qc.getQueryData(['faculty', 'extractions', 'id', 'u1', 'b'])).toEqual(fila('b'));
    });

    it('no toca cachés ajenas a la clave', () => {
        const qc = clienteConDatos();
        removeFromCachedLists<Fila>(qc, CLAVE, f => f.id === 'b');
        expect(qc.getQueryData(['otra', 'cosa'])).toEqual([fila('b')]);
    });

    it('quitar algo que no está no altera nada', () => {
        const qc = clienteConDatos();
        removeFromCachedLists<Fila>(qc, CLAVE, f => f.id === 'z');
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1']))
            .toEqual([fila('a'), fila('b')]);
    });
});

describe('updateInCachedLists', () => {
    it('parcha sólo lo que coincide y respeta el orden', () => {
        const qc = clienteConDatos();
        updateInCachedLists<Fila>(qc, CLAVE, f => f.id === 'b', f => ({ ...f, title: 'nuevo' }));

        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1']))
            .toEqual([fila('a'), { id: 'b', title: 'nuevo' }]);
    });
});

describe('restoreCaches', () => {
    it('devuelve las listas a como estaban cuando el servidor rechaza', () => {
        const qc = clienteConDatos();
        const antes = qc.getQueryData(['faculty', 'extractions', 'user', 'u1']);

        const snapshots = removeFromCachedLists<Fila>(qc, CLAVE, f => f.id === 'b');
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1'])).not.toEqual(antes);

        restoreCaches(qc, snapshots);
        expect(qc.getQueryData(['faculty', 'extractions', 'user', 'u1'])).toEqual(antes);
        expect(qc.getQueryData(['faculty', 'extractions', 'project', 'u1', 'p1'])).toEqual([fila('b')]);
    });
});
