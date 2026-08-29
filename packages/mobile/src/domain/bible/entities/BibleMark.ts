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
    /**
     * Palabras marcadas DENTRO del versículo, por índice, ambas incluidas.
     *
     * Ausentes significa el versículo entero — que es como se guardaban todas
     * las marcas antes, así que las viejas siguen leyéndose sin migrar nada.
     *
     * El índice de palabra alcanza como ancla porque el texto bíblico no se
     * edita: la palabra 4 de Jonás 1:3 va a seguir siendo la misma palabra
     * dentro de veinte años. Es la misma razón por la que acá no hace falta
     * el reanclado por offsets que sí necesita el sermón.
     */
    from?: number;
    to?: number;
    createdAt: Date;
}

/** Rango de palabras a marcar dentro de un versículo. Sin extremos, entero. */
export interface VerseWordRange {
    verse: number;
    from?: number;
    to?: number;
}

/** Clave estable de un versículo, para buscar marcas sin recorrer la lista. */
export const verseKey = (bookId: string, chapter: number, verse: number): string =>
    `${bookId}.${chapter}.${verse}`;
