import type { QueryClient } from '@tanstack/react-query';
import type { Extraction } from '@dosfilos/domain';

/**
 * Las escrituras optimistas sobre la caché de extracciones, como
 * funciones puras sobre un `QueryClient`.
 *
 * Viven fuera del hook para poder probarse contra un `QueryClient` de
 * verdad, sin montar React ni Firebase — y sin copiar la lógica a un
 * archivo de pruebas, que es probar un duplicado y no el código.
 */

/** Fotos de las consultas tocadas, para poder deshacer. */
export type CacheSnapshots = Array<[readonly unknown[], unknown]>;

const EXTRACTIONS_KEY = ['faculty', 'extractions'] as const;

/**
 * Saca una extracción de todas las listas en caché antes de que el
 * servidor conteste, y devuelve con qué deshacerlo.
 *
 * Las consultas de UNA extracción (`…,'id',…`) no son arrays y se
 * dejan intactas: quien las lee está mirando ese documento, y hacerlo
 * desaparecer de abajo del lector es peor que esperar al `onSettled`,
 * que las invalida igual.
 */
export function removeExtractionFromCaches(
    queryClient: QueryClient,
    extractionId: string,
): CacheSnapshots {
    queryClient.cancelQueries({ queryKey: EXTRACTIONS_KEY });
    const snapshots: CacheSnapshots = [];
    queryClient
        .getQueriesData<Extraction[]>({ queryKey: EXTRACTIONS_KEY })
        .forEach(([key, data]) => {
            if (!Array.isArray(data)) return;
            snapshots.push([key, data]);
            queryClient.setQueryData(key, data.filter(e => e.id !== extractionId));
        });
    return snapshots;
}

/** Devuelve cada consulta a como estaba antes de la escritura optimista. */
export function restoreCaches(queryClient: QueryClient, snapshots: CacheSnapshots): void {
    snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
