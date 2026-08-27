import { SINGLE_CHAPTER_BOOK_IDS, resolveBibleBook } from './bibleBookTable';

export interface BibleReferenceParts {
    /** La clave de la tabla, acentuada: `'Filemón'`. Lo que se le muestra. */
    bookKey: string;
    /** El id en los datos: `'phm'`. Con lo que se leen los versículos. */
    bookId: string;
    chapter: number;
    /** `0` significa el capítulo entero. */
    verseStart: number;
    verseEnd?: number;
}

/**
 * Interpreta una referencia bíblica escrita por una persona.
 *
 * ERA LA MISMA FUNCIÓN, ESCRITA DOS VECES. Las copias de la página de Biblia y
 * del asistente eran idénticas letra por letra salvo la última línea —una
 * devolvía el id y la otra la clave— y aun así cada una tenía su propia tabla
 * de libros, que ya habían divergido. Acá se resuelve una vez y se devuelven
 * LAS DOS formas; quien llama elige cuál expone.
 *
 * EL NÚMERO SUELTO ES AMBIGUO Y SE RESUELVE POR EL LIBRO:
 *
 *   "Romanos 1"    → capítulo 1 entero        (Romanos tiene 16 capítulos)
 *   "Filemón 8"    → capítulo 1, versículo 8  (Filemón tiene uno solo)
 *   "Juan 3:16"    → capítulo 3, versículo 16
 *   "Juan 3:16-17" → capítulo 3, versículos 16 a 17
 *   "Filemón 8-21" → capítulo 1, versículos 8 a 21
 *
 * SE RECHAZAN LOS RANGOS DE CAPÍTULOS ("Romanos 1-3", "Juan 3-4:1"). No es una
 * limitación pendiente: un rango de capítulos no cabe en esta forma, y
 * aceptarlo a medias devolvería una referencia que dice algo distinto de lo que
 * el pastor escribió. Es preferible no entender a entender mal.
 */
export function parseBibleReferenceParts(ref: string): BibleReferenceParts | null {
    const match = ref.trim().match(
        /^((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+de\s+los\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)(?:\s+(\d+)(?:[-–](\d+))?(?:[:.](\d+)(?:[-–](\d+))?)?)?$/i,
    );
    if (!match) return null;

    const libro = resolveBibleBook(match[1]?.trim() || '');
    if (!libro) return null;

    const num1 = match[2] ? parseInt(match[2]) : undefined;
    const num1End = match[3] ? parseInt(match[3]) : undefined;
    const num2 = match[4] ? parseInt(match[4]) : undefined;
    const num2End = match[5] ? parseInt(match[5]) : undefined;

    const unSoloCapitulo = SINGLE_CHAPTER_BOOK_IDS.has(libro.id);

    let chapter: number;
    let verseStart: number;
    let verseEnd: number | undefined;

    if (num1 === undefined) {
        // Sólo el libro.
        chapter = 1;
        verseStart = 0;
    } else if (num2 === undefined) {
        if (unSoloCapitulo) {
            chapter = 1;
            verseStart = num1;
            verseEnd = num1End;
        } else {
            if (num1End !== undefined) return null; // "Romanos 1-3"
            chapter = num1;
            verseStart = 0;
        }
    } else {
        if (num1End !== undefined) return null; // "Juan 3-4:1"
        chapter = num1;
        verseStart = num2;
        verseEnd = num2End;
    }

    return { bookKey: libro.key, bookId: libro.id, chapter, verseStart, verseEnd };
}
