import type { PassageReference } from '../canon/passage-reference';
import type { BibleBookId } from '../canon/BibleCanon';
import { VERSIFICATION_SPANS, type VersificationSpan } from './versificationMap';

/**
 * Traduce referencias entre la versificación del TEXTO ORIGINAL —donde vive
 * la estructura literaria— y la del LECTOR —la de la Biblia que el pastor
 * tiene abierta.
 *
 * El problema que resuelve, con el caso que lo destapó: el detector de
 * perícopas divide sobre el Masorético, como debe, y devolvió «Jonás
 * 2:1-10». Eso se le mostró al pastor tal cual, y él lo leyó como su RVR
 * —donde Jonás 2 tiene 10 versículos y 2:11 no existe—. El corte era
 * correcto; la etiqueta estaba en el idioma equivocado. En hebreo el pez se
 * traga a Jonás en 2:1 y en castellano en 1:17, así que todo el capítulo va
 * corrido en uno.
 *
 * La regla que ordena el módulo: **se guarda en coordenadas del original y
 * se traduce al mostrar.** El texto original es la fuente de verdad —ahí
 * está la gramática que justifica el corte— y la versificación del lector es
 * una vista.
 *
 * Lo que NO hace: inventar. Cuando un versículo no tiene equivalente en el
 * otro lado, lo dice en vez de devolver un número plausible.
 */

/** Índice por libro+capítulo, armado una vez. La tabla es estática. */
const byReader = new Map<string, VersificationSpan[]>();
const byOriginal = new Map<string, VersificationSpan[]>();
for (const span of VERSIFICATION_SPANS) {
    const r = `${span.book}:${span.chapter}`;
    const o = `${span.book}:${span.originalChapter}`;
    (byReader.get(r) ?? byReader.set(r, []).get(r)!).push(span);
    (byOriginal.get(o) ?? byOriginal.set(o, []).get(o)!).push(span);
}

export interface MappedVerse {
    chapter: number;
    /**
     * `0` significa el TÍTULO del salmo: el Masorético lo cuenta como
     * versículo 1 y las versiones castellanas lo imprimen sin numerar. No
     * es un error ni un centinela de «desconocido» — es la referencia
     * honesta a una línea que existe en las dos Biblias y que solo una
     * numera.
     */
    verse: number;
    /** True cuando las dos versificaciones NO coinciden en este versículo. */
    differs: boolean;
}

/** Del texto original a la Biblia del lector. */
export function verseToReader(
    book: BibleBookId,
    chapter: number,
    verse: number,
): MappedVerse {
    const spans = byOriginal.get(`${book}:${chapter}`);
    const hit = spans?.find(s => verse >= s.originalFrom && verse <= s.originalTo);
    if (!hit) return { chapter, verse, differs: false };
    return {
        chapter: hit.chapter,
        verse: hit.from + (verse - hit.originalFrom),
        differs: true,
    };
}

/** De la Biblia del lector al texto original. */
export function verseToOriginal(
    book: BibleBookId,
    chapter: number,
    verse: number,
): MappedVerse {
    const spans = byReader.get(`${book}:${chapter}`);
    const hit = spans?.find(s => verse >= s.from && verse <= s.to);
    if (!hit) return { chapter, verse, differs: false };
    return {
        chapter: hit.originalChapter,
        verse: hit.originalFrom + (verse - hit.from),
        differs: true,
    };
}

export interface MappedPassage {
    passage: PassageReference;
    /**
     * True cuando la traducción movió algún extremo. Es la señal para
     * explicarle al pastor por qué el corte no coincide con los capítulos
     * de su Biblia — no para bloquearlo.
     */
    differs: boolean;
    /**
     * True cuando el pasaje traducido cambia de capítulo respecto del
     * original. Es el caso de Jonás: TM 2:1-11 es RVR 1:17-2:10, y cruza la
     * frontera del capítulo 1 en la Biblia del pastor.
     */
    crossesChapterBoundary: boolean;
}

/**
 * Traduce un pasaje completo mapeando sus dos extremos.
 *
 * Los pasajes sin versículos explícitos (capítulos enteros) se devuelven
 * intactos: la correspondencia de capítulo a capítulo no es ambigua en el
 * canon protestante salvo en Joel y Malaquías, y ahí un rango de capítulos
 * completos no tiene una traducción de un solo tramo que no mienta. Se
 * prefiere no tocar antes que inventar.
 */
export function passageToReader(passage: PassageReference): MappedPassage {
    return mapPassage(passage, verseToReader);
}

export function passageToOriginal(passage: PassageReference): MappedPassage {
    return mapPassage(passage, verseToOriginal);
}

function mapPassage(
    passage: PassageReference,
    mapVerse: (b: BibleBookId, c: number, v: number) => MappedVerse,
): MappedPassage {
    if (passage.verseStart === null || passage.verseEnd === null) {
        return { passage, differs: false, crossesChapterBoundary: false };
    }
    const start = mapVerse(passage.bookId, passage.chapterStart, passage.verseStart);
    const end = mapVerse(passage.bookId, passage.chapterEnd, passage.verseEnd);
    const differs = start.differs || end.differs;
    const mapped: PassageReference = {
        ...passage,
        chapterStart: start.chapter,
        chapterEnd: end.chapter,
        verseStart: start.verse,
        verseEnd: end.verse,
    };
    return {
        passage: mapped,
        differs,
        crossesChapterBoundary: differs && start.chapter !== passage.chapterStart,
    };
}

/** True cuando el libro difiere en algún punto entre las dos versificaciones. */
export function bookHasVersificationDifferences(book: BibleBookId): boolean {
    for (const span of VERSIFICATION_SPANS) {
        if (span.book === book) return true;
    }
    return false;
}
