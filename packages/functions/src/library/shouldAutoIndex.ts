import { isStructuredExtractionVersion } from './extractionVersions';

/**
 * Si un cambio en un `library_resource` debe disparar el indexado
 * automático.
 *
 * **Por qué es una función aparte.** La condición se escribía dentro
 * del disparador, y ahí adentro no se puede probar: exige un evento de
 * Firestore. Sacarla permite fijar en pruebas el caso que estuvo roto
 * sin que nadie lo viera.
 *
 * **El caso que estuvo roto.** El disparador era `onDocumentUpdated` y
 * exigía una TRANSICIÓN de `textExtractionStatus` a `ready`. La subida
 * normal la produce —el documento nace en `pending`, pasa a
 * `processing` y termina en `ready`—, así que el camino común
 * funcionaba. Pero un documento que NACE en `ready` no produce ninguna
 * transición, y ese es el caso de la biblioteca clonada de la cuenta
 * embajador: libros copiados con su extracción ya hecha que no se
 * indexaron nunca.
 *
 * Un libro sin indexar NO EXISTE para el sistema: no aparece en
 * búsquedas, no se puede citar, y el trabajo se escribe sin él sin
 * declarar que faltaba.
 */
export const INDEXER_VERSION_CURRENT = '2.0-structured';

export interface ResourceSnapshotForIndexing {
    textExtractionStatus?: string;
    extractionVersion?: string;
    structuredContentUrl?: string;
    indexerVersion?: string;
    /**
     * Lo escribe la extracción en `true` cada vez que produce texto
     * nuevo, y el indexador lo baja a `false` al terminar. Es la forma
     * que tiene el pipeline de decir «el índice que hay ya no
     * corresponde al contenido».
     */
    needsReindex?: boolean;
}

export type AutoIndexDecision =
    | { index: true }
    | { index: false; reason: AutoIndexSkipReason };

export type AutoIndexSkipReason =
    | 'deleted'
    | 'not-ready'
    | 'already-was-ready'
    | 'unsupported-extraction'
    | 'no-structured-content'
    | 'already-indexed';

export function shouldAutoIndex(
    before: ResourceSnapshotForIndexing | undefined,
    after: ResourceSnapshotForIndexing | undefined,
): AutoIndexDecision {
    // Borrado: no queda documento que indexar.
    if (!after) return { index: false, reason: 'deleted' };

    if (after.textExtractionStatus !== 'ready') {
        return { index: false, reason: 'not-ready' };
    }
    // `before` ausente es una CREACIÓN. Un documento que nace listo
    // cuenta: es el caso que el disparador anterior no veía.
    if (before?.textExtractionStatus === 'ready') {
        return { index: false, reason: 'already-was-ready' };
    }
    if (!isStructuredExtractionVersion(after.extractionVersion)) {
        return { index: false, reason: 'unsupported-extraction' };
    }
    if (!after.structuredContentUrl) {
        return { index: false, reason: 'no-structured-content' };
    }
    // Ya indexado con el indexador vigente: reindexar sería trabajo y
    // gasto por nada.
    //
    // Salvo que la extracción haya corrido de nuevo. `needsReindex`
    // existe justo para eso, y no se estaba mirando: al re-extraer un
    // libro, la versión del indexador seguía siendo la vigente, así que
    // el disparador lo daba por indexado y el índice viejo —el del
    // texto anterior— se quedaba puesto. Un libro re-extraído por estar
    // mal indexado terminaba igual de mal indexado, sin decirlo.
    if (after.indexerVersion === INDEXER_VERSION_CURRENT && after.needsReindex !== true) {
        return { index: false, reason: 'already-indexed' };
    }
    return { index: true };
}
