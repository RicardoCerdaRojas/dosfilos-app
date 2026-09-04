import type { QueryClient } from '@tanstack/react-query';

/**
 * Escrituras optimistas sobre listas en caché de React Query.
 *
 * **Por qué existe.** Una acción instantánea —borrar, renombrar,
 * archivar, asignar— que sólo invalida al terminar deja la pantalla
 * igual durante todo el viaje de ida y vuelta más el refetch. Medido
 * en producción: alrededor de un segundo entre confirmar un borrado y
 * ver desaparecer la fila, sin nada en el medio. Un segundo de
 * silencio después de una orden se lee como «no me hizo caso», y la
 * reacción natural es volver a pulsar.
 *
 * La respuesta correcta no es un indicador de carga sino que la lista
 * cambie en el mismo gesto: la acción casi siempre funciona, y verla
 * ocurrir es mejor señal que ver una ruedita. El caso raro se cubre
 * devolviendo la lista a su lugar y diciéndolo.
 *
 * **Funciones puras sobre un `QueryClient`**, fuera de los hooks, para
 * poder probarlas contra un cliente de verdad sin montar React ni
 * Firebase — y sin copiar la lógica al archivo de pruebas, que es
 * probar un duplicado y no el código.
 */

/** Fotos de las consultas tocadas, para poder deshacer. */
export type CacheSnapshots = Array<[readonly unknown[], unknown]>;

/**
 * Reescribe todas las listas cacheadas bajo `queryKey`.
 *
 * Sólo toca consultas cuyo dato sea un ARRAY. Las que guardan un
 * elemento suelto se dejan intactas a propósito: quien las lee está
 * mirando ese documento abierto, y hacerlo desaparecer de abajo del
 * lector es peor que esperar a la invalidación del `onSettled`.
 */
export function patchCachedLists<T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    rewrite: (items: T[]) => T[],
): CacheSnapshots {
    queryClient.cancelQueries({ queryKey });
    const snapshots: CacheSnapshots = [];
    queryClient.getQueriesData<T[]>({ queryKey }).forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        snapshots.push([key, data]);
        queryClient.setQueryData(key, rewrite(data));
    });
    return snapshots;
}

/** Saca de las listas cacheadas todo lo que cumpla `matches`. */
export function removeFromCachedLists<T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    matches: (item: T) => boolean,
): CacheSnapshots {
    return patchCachedLists<T>(queryClient, queryKey, items => items.filter(item => !matches(item)));
}

/** Aplica `patch` a los elementos que cumplan `matches`, sin mover el resto. */
export function updateInCachedLists<T>(
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    matches: (item: T) => boolean,
    patch: (item: T) => T,
): CacheSnapshots {
    return patchCachedLists<T>(queryClient, queryKey, items =>
        items.map(item => (matches(item) ? patch(item) : item)),
    );
}

/** Devuelve cada consulta a como estaba antes de la escritura optimista. */
export function restoreCaches(queryClient: QueryClient, snapshots: CacheSnapshots): void {
    snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
