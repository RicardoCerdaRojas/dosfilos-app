import type { LibraryResourceEntity } from '@dosfilos/domain';

/**
 * Cuánto tiempo se le concede al auto-indexador antes de dejar de
 * suponer que está corriendo.
 *
 * La tarjeta decía «Indexando» POR INFERENCIA: cuando falta
 * `indexingStatus` pero la extracción está lista y la versión es
 * auto-indexable, la interfaz asumía que el disparador ya corre.
 * La suposición es correcta casi siempre —el trigger dispara en menos
 * de un segundo tras la escritura de la extracción—, y cuando es falsa
 * NO HAY SALIDA: el estado `indexing` no ofrece el botón «Procesar»,
 * que sólo aparece con `not-indexed`.
 *
 * Observado en producción: «Indexando… hace 57 s · ~4 min estimado»
 * sobre un documento sin `indexingStatus`, sin `indexedChunkCount` y
 * sin `indexerVersion`, con los tres servicios de indexado sin una sola
 * línea de log. Nadie estaba indexando.
 *
 * **Un progreso que no puede fallar tampoco puede terminar.** Por eso
 * el optimismo CADUCA: pasados estos segundos sin confirmación del
 * servidor, el recurso cae a `not-indexed` y recupera su botón.
 *
 * Dos minutos y no menos: el disparador puede arrancar en frío, y
 * declarar muerto lo que todavía no despertó devolvería al usuario a un
 * botón que no hace falta pulsar.
 */
export const AUTO_INDEX_GRACE_SECONDS = 120;

/**
 * Desde cuándo se cuenta la espera.
 *
 * `updatedAt` es la misma escritura que dejó la extracción en `ready`
 * —el trigger de extracción escribe estado y marca de tiempo juntos—,
 * así que sirve de ancla sin depender de cuándo el usuario abrió la
 * página.
 */
export function autoIndexGraceRemainingMs(
    resource: Pick<LibraryResourceEntity, 'updatedAt'>,
    now: Date,
    graceSeconds: number = AUTO_INDEX_GRACE_SECONDS,
): number {
    const anchor = resource.updatedAt;
    // Sin ancla no se puede medir la espera. Se concede el beneficio de
    // la duda una sola vez: el recurso se trata como recién extraído.
    if (!(anchor instanceof Date) || Number.isNaN(anchor.getTime())) return graceSeconds * 1000;
    const elapsedMs = now.getTime() - anchor.getTime();
    return Math.max(0, graceSeconds * 1000 - elapsedMs);
}

/** Si todavía es razonable suponer que el auto-indexador está trabajando. */
export function isWithinAutoIndexGrace(
    resource: Pick<LibraryResourceEntity, 'updatedAt'>,
    now: Date,
    graceSeconds: number = AUTO_INDEX_GRACE_SECONDS,
): boolean {
    return autoIndexGraceRemainingMs(resource, now, graceSeconds) > 0;
}
