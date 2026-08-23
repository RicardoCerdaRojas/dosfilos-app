/**
 * Historial de versiones por sección, DURABLE.
 *
 * POR QUÉ EXISTE: el historial vivía sólo en `localStorage`. Se perdía al
 * cambiar de navegador o de equipo, no existía entre sesiones de incógnito, y
 * cualquier limpieza del navegador se llevaba el trabajo del pastor. Un
 * "volver a la versión anterior" que depende del navegador no es una garantía,
 * es una casualidad.
 *
 * `localStorage` NO se elimina: sigue siendo la copia rápida y el respaldo
 * offline. Firestore es la fuente durable.
 */

/** Cuántas versiones se conservan POR SECCIÓN. */
export const CONTENT_HISTORY_MAX_VERSIONS = 10;

export interface StoredSectionVersion {
    id: string;
    sectionId: string;
    content: unknown;
    /** ISO — Firestore no guarda `Date` dentro de un mapa anidado sin convertir. */
    timestamp: string;
    changeDescription: string;
    aiSuggestion?: string;
}

export interface ContentHistoryDoc {
    /** `sermon` | `homiletics` | `exegesis`. */
    contentType: string;
    /** Versiones por sección, ya recortadas al tope. */
    sections: Record<string, StoredSectionVersion[]>;
    updatedAt?: Date;
}

export interface IContentHistoryRepository {
    load(sermonId: string, contentType: string): Promise<ContentHistoryDoc | null>;
    save(sermonId: string, doc: ContentHistoryDoc): Promise<void>;
}

/**
 * Recorta cada sección al tope, conservando las MÁS RECIENTES.
 *
 * Sin tope el documento crece sin límite y termina chocando con el máximo de
 * 1 MB de Firestore — un fallo que aparecería recién después de muchas
 * ediciones, en el sermón de alguien que trabaja mucho, y se leería como "no
 * se guarda" sin más explicación.
 *
 * Se descartan las viejas y no las nuevas porque el valor de este historial es
 * deshacer lo último; nadie vuelve a la versión doce ediciones atrás.
 */
export function trimContentHistory(
    sections: Record<string, StoredSectionVersion[]>,
    max: number = CONTENT_HISTORY_MAX_VERSIONS,
): Record<string, StoredSectionVersion[]> {
    const out: Record<string, StoredSectionVersion[]> = {};
    for (const [sectionId, versions] of Object.entries(sections)) {
        if (!Array.isArray(versions) || versions.length === 0) continue;
        out[sectionId] = versions.slice(-max);
    }
    return out;
}
