import { describe, it, expect } from 'vitest';
import {
    INDEXER_VERSION_CURRENT,
    shouldAutoIndex,
    type ResourceSnapshotForIndexing,
} from '../shouldAutoIndex';

const listo: ResourceSnapshotForIndexing = {
    textExtractionStatus: 'ready',
    extractionVersion: '3.0-llamaparse',
    structuredContentUrl: 'gs://bucket/users/u/library/r/structured.md',
};

describe('shouldAutoIndex', () => {
    it('indexa cuando la extracción TERMINA: el camino de siempre', () => {
        expect(shouldAutoIndex({ textExtractionStatus: 'processing' }, listo)).toEqual({ index: true });
    });

    it('indexa un documento que NACE listo — el caso de la biblioteca clonada', () => {
        // `before` ausente es una creación. Con el disparador anterior
        // —que exigía una transición— estos libros no se indexaban nunca.
        expect(shouldAutoIndex(undefined, listo)).toEqual({ index: true });
    });

    it('no reindexa lo que ya estaba listo antes del cambio', () => {
        expect(shouldAutoIndex(listo, { ...listo, title: 'renombrado' } as ResourceSnapshotForIndexing))
            .toEqual({ index: false, reason: 'already-was-ready' });
    });

    it('no indexa lo que todavía no terminó de extraerse', () => {
        expect(shouldAutoIndex(undefined, { ...listo, textExtractionStatus: 'processing' }))
            .toEqual({ index: false, reason: 'not-ready' });
        expect(shouldAutoIndex(undefined, { ...listo, textExtractionStatus: 'failed' }))
            .toEqual({ index: false, reason: 'not-ready' });
    });

    it('no indexa un borrado', () => {
        expect(shouldAutoIndex(listo, undefined)).toEqual({ index: false, reason: 'deleted' });
    });

    it('no indexa extracciones que no emiten el contrato de páginas', () => {
        expect(shouldAutoIndex(undefined, { ...listo, extractionVersion: '1.0-legacy' }))
            .toEqual({ index: false, reason: 'unsupported-extraction' });
    });

    it('no indexa sin el archivo estructurado', () => {
        expect(shouldAutoIndex(undefined, { ...listo, structuredContentUrl: undefined }))
            .toEqual({ index: false, reason: 'no-structured-content' });
    });

    it('no repite trabajo ya hecho con el indexador vigente', () => {
        expect(shouldAutoIndex(undefined, { ...listo, indexerVersion: INDEXER_VERSION_CURRENT }))
            .toEqual({ index: false, reason: 'already-indexed' });
    });

    it('reindexa lo ya indexado cuando la extracción volvió a correr', () => {
        // `needsReindex` lo escribe la extracción al producir texto
        // nuevo. Sin mirarlo, re-extraer un libro mal indexado lo dejaba
        // con el índice viejo puesto.
        expect(shouldAutoIndex(undefined, { ...listo, indexerVersion: INDEXER_VERSION_CURRENT, needsReindex: true }))
            .toEqual({ index: true });
    });

    it('no reindexa en bucle: al terminar, el indexador baja needsReindex', () => {
        expect(shouldAutoIndex(undefined, { ...listo, indexerVersion: INDEXER_VERSION_CURRENT, needsReindex: false }))
            .toEqual({ index: false, reason: 'already-indexed' });
    });

    it('sí reindexa lo indexado con una versión vieja del indexador', () => {
        expect(shouldAutoIndex(undefined, { ...listo, indexerVersion: '1.0-viejo' }))
            .toEqual({ index: true });
    });
});
