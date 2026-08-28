import type { HighlightColor, MarkStyle } from '@dosfilos/domain';

/**
 * Marca del pastor sobre un versículo.
 *
 * A diferencia de las marcas del sermón, acá NO hace falta reanclar por
 * offsets: el versículo es una dirección estable —nadie edita Jonás 1:3— así
 * que `(versión, libro, capítulo, versículo)` alcanza y sobrevive a todo.
 * Es el mismo vocabulario de color y trazo que el púlpito, a propósito:
 * resaltar un versículo tiene que sentirse igual que resaltar el sermón.
 */
export interface BibleMark {
    id: string;
    versionId: string;
    bookId: string;
    chapter: number;
    verse: number;
    color: HighlightColor;
    style: MarkStyle;
    createdAt: Date;
}

/** Clave estable de un versículo, para buscar marcas sin recorrer la lista. */
export const verseKey = (bookId: string, chapter: number, verse: number): string =>
    `${bookId}.${chapter}.${verse}`;
