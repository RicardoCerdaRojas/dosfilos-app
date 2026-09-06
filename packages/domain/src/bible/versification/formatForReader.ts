import { formatPassageReference, type PassageReference } from '../canon/passage-reference';
import type { BibleBookId } from '../canon/BibleCanon';
import { passageToOriginal, passageToReader } from './mapVersification';

/**
 * Formatea un pasaje EN LA NUMERACIÓN DE LA BIBLIA DEL PASTOR.
 *
 * `formatPassageReference` imprime los números tal como están guardados, que
 * son los del texto original. Eso es lo correcto dentro del trabajo
 * exegético —un paper sobre el hebreo cita el Masorético— y es exactamente
 * lo que NO hay que mostrarle a alguien que está eligiendo qué predicar el
 * domingo con su RVR abierta.
 *
 * Las dos funciones conviven a propósito. La pregunta para elegir una u otra
 * es siempre la misma: **¿quién lee este número?** Si lo lee el pastor
 * planificando o predicando, va esta. Si lo lee el modelo, el WLC, o el
 * aparato de un paper académico, va la otra.
 */
export function formatPassageForReader(
    passage: PassageReference,
    language: 'es' | 'en' = 'es',
): string {
    return formatPassageReference(passageToReader(passage).passage, language);
}

/** Un tramo suelto, como los que maneja el planificador de perícopas. */
export interface VerseRange {
    chapterStart: number;
    verseStart: number;
    chapterEnd: number;
    verseEnd: number;
}

export interface ReaderRange extends VerseRange {
    /** True cuando la numeración del lector no coincide con la del original. */
    differsFromOriginal: boolean;
}

/**
 * Traduce un tramo del planificador a la numeración del lector.
 *
 * El planificador trabaja con tramos sueltos (sin `bookId` adentro) porque
 * la página ya sabe de qué libro se trata; por eso el libro viaja aparte.
 */
export function rangeToReader(bookId: BibleBookId, range: VerseRange): ReaderRange {
    const mapped = passageToReader(toPassage(bookId, range));
    return { ...fromPassage(mapped.passage, range), differsFromOriginal: mapped.differs };
}

/**
 * La vuelta: lo que el pastor escribió en su numeración, llevado a la del
 * original para guardarlo.
 *
 * Sin esto, editar la frontera de una perícopa rompería la regla del
 * sistema: se guarda en coordenadas del original. El pastor escribiría
 * «1:17» pensando en el pez y quedaría guardado como 1:17 del Masorético,
 * que es otro versículo.
 */
export function rangeToOriginal(bookId: BibleBookId, range: VerseRange): VerseRange {
    return fromPassage(passageToOriginal(toPassage(bookId, range)).passage, range);
}

function toPassage(bookId: BibleBookId, range: VerseRange): PassageReference {
    return {
        bookId,
        chapterStart: range.chapterStart,
        chapterEnd: range.chapterEnd,
        verseStart: range.verseStart,
        verseEnd: range.verseEnd,
    };
}

function fromPassage(passage: PassageReference, fallback: VerseRange): VerseRange {
    return {
        chapterStart: passage.chapterStart,
        chapterEnd: passage.chapterEnd,
        verseStart: passage.verseStart ?? fallback.verseStart,
        verseEnd: passage.verseEnd ?? fallback.verseEnd,
    };
}
