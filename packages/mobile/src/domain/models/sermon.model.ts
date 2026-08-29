/**
 * Tipos del módulo de sermones de la tablet.
 *
 * El DETALLE usa el tipo canónico `Sermon` de @dosfilos/domain (M-01: los
 * tipos no se duplican; Metro y tsconfig ya resuelven el workspace).
 *
 * El RESUMEN de lista es la proyección que devuelve el callable
 * `getSermonsListSummary` (PR #297): campos de cabecera, sin `content` ni
 * manifest. No es una entidad de dominio — es el contrato del callable.
 */
import type { Sermon } from '@dosfilos/domain';

export type { Sermon };

export interface SermonSummary {
    id: string;
    title: string;
    status: Sermon['status'];
    bibleReferences: string[];
    tags: string[];
    seriesId?: string;
    hasContent: boolean;
    publishedAt?: Date;
    updatedAt?: Date;
    /** Si este doc es una versión publicada de otro sermón, el id raíz. */
    versionOf?: string;
    /** Si es la COPIA publicada de un borrador, el id de ese borrador. */
    sourceSermonId?: string;
    /** Cuántas veces se predicó. Cero es "todavía no". */
    timesPreached: number;
    /** La última vez que se predicó, si alguna. */
    lastPreachedAt?: Date;
}

/** Grupo de lista: una serie con sus sermones, o los sueltos (seriesId null). */
export interface SermonListGroup {
    seriesId: string | null;
    seriesTitle: string | null;
    sermons: SermonSummary[];
}
