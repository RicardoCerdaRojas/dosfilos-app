import type { BibleBookId } from '../canon/BibleCanon';

/**
 * ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-mapa-versificacion.mjs
 *
 * Correspondencia entre la versificación que lee el pastor (la de las
 * versiones castellanas modernas, RVR incluida) y la del texto original
 * (Texto Masorético para el AT).
 *
 * Fuente: versificación oficial de las Sociedades Bíblicas Unidas
 * (https://github.com/ubsicap/versification_json, MIT, © 2019 United Bible
 * Societies Institute for Computer Assisted Publishing), archivo `eng`,
 * que describe las versiones modernas relativas a `org`.
 *
 * 144 tramos en 27 libros. Todo lo que no
 * aparece acá corresponde uno a uno: mismo capítulo, mismo versículo.
 *
 * El `from: 0` de los Salmos NO es un error: es el título del salmo
 * («Salmo de David…»), que el Masorético cuenta como versículo 1 y las
 * versiones castellanas imprimen sin numerar. Representarlo como el
 * versículo 0 del lector es lo que deja expresar la correspondencia sin
 * mentir en ninguno de los dos lados.
 */
export interface VersificationSpan {
    book: BibleBookId;
    /** Capítulo en la versificación del lector. */
    chapter: number;
    /** Primer versículo del tramo, del lado del lector. `0` = título del salmo. */
    from: number;
    /** Último versículo del tramo, del lado del lector. */
    to: number;
    /** Capítulo correspondiente en el texto original. */
    originalChapter: number;
    originalFrom: number;
    originalTo: number;
}

export const VERSIFICATION_SPANS: ReadonlyArray<VersificationSpan> = [
    { book: '1CH', chapter: 6, from: 1, to: 15, originalChapter: 5, originalFrom: 27, originalTo: 41 },
    { book: '1CH', chapter: 6, from: 16, to: 81, originalChapter: 6, originalFrom: 1, originalTo: 66 },
    { book: '1CH', chapter: 12, from: 4, to: 40, originalChapter: 12, originalFrom: 5, originalTo: 41 },
    { book: '1KI', chapter: 4, from: 21, to: 34, originalChapter: 5, originalFrom: 1, originalTo: 14 },
    { book: '1KI', chapter: 5, from: 1, to: 18, originalChapter: 5, originalFrom: 15, originalTo: 32 },
    { book: '1KI', chapter: 22, from: 43, to: 53, originalChapter: 22, originalFrom: 44, originalTo: 54 },
    { book: '1SA', chapter: 20, from: 42, to: 42, originalChapter: 21, originalFrom: 1, originalTo: 1 },
    { book: '1SA', chapter: 21, from: 1, to: 15, originalChapter: 21, originalFrom: 2, originalTo: 16 },
    { book: '1SA', chapter: 23, from: 29, to: 29, originalChapter: 24, originalFrom: 1, originalTo: 1 },
    { book: '1SA', chapter: 24, from: 1, to: 22, originalChapter: 24, originalFrom: 2, originalTo: 23 },
    { book: '2CH', chapter: 2, from: 1, to: 1, originalChapter: 1, originalFrom: 18, originalTo: 18 },
    { book: '2CH', chapter: 2, from: 2, to: 18, originalChapter: 2, originalFrom: 1, originalTo: 17 },
    { book: '2CH', chapter: 14, from: 1, to: 1, originalChapter: 13, originalFrom: 23, originalTo: 23 },
    { book: '2CH', chapter: 14, from: 2, to: 15, originalChapter: 14, originalFrom: 1, originalTo: 14 },
    { book: '2KI', chapter: 11, from: 21, to: 21, originalChapter: 12, originalFrom: 1, originalTo: 1 },
    { book: '2KI', chapter: 12, from: 1, to: 21, originalChapter: 12, originalFrom: 2, originalTo: 22 },
    { book: '2SA', chapter: 18, from: 33, to: 33, originalChapter: 19, originalFrom: 1, originalTo: 1 },
    { book: '2SA', chapter: 19, from: 1, to: 43, originalChapter: 19, originalFrom: 2, originalTo: 44 },
    { book: 'DAN', chapter: 4, from: 1, to: 3, originalChapter: 3, originalFrom: 31, originalTo: 33 },
    { book: 'DAN', chapter: 4, from: 4, to: 37, originalChapter: 4, originalFrom: 1, originalTo: 34 },
    { book: 'DAN', chapter: 5, from: 31, to: 31, originalChapter: 6, originalFrom: 1, originalTo: 1 },
    { book: 'DAN', chapter: 6, from: 1, to: 28, originalChapter: 6, originalFrom: 2, originalTo: 29 },
    { book: 'DEU', chapter: 12, from: 32, to: 32, originalChapter: 13, originalFrom: 1, originalTo: 1 },
    { book: 'DEU', chapter: 13, from: 1, to: 18, originalChapter: 13, originalFrom: 2, originalTo: 19 },
    { book: 'DEU', chapter: 22, from: 30, to: 30, originalChapter: 23, originalFrom: 1, originalTo: 1 },
    { book: 'DEU', chapter: 23, from: 1, to: 25, originalChapter: 23, originalFrom: 2, originalTo: 26 },
    { book: 'DEU', chapter: 29, from: 1, to: 1, originalChapter: 28, originalFrom: 69, originalTo: 69 },
    { book: 'DEU', chapter: 29, from: 2, to: 29, originalChapter: 29, originalFrom: 1, originalTo: 28 },
    { book: 'ECC', chapter: 5, from: 1, to: 1, originalChapter: 4, originalFrom: 17, originalTo: 17 },
    { book: 'ECC', chapter: 5, from: 2, to: 20, originalChapter: 5, originalFrom: 1, originalTo: 19 },
    { book: 'EXO', chapter: 8, from: 1, to: 4, originalChapter: 7, originalFrom: 26, originalTo: 29 },
    { book: 'EXO', chapter: 8, from: 5, to: 32, originalChapter: 8, originalFrom: 1, originalTo: 28 },
    { book: 'EXO', chapter: 22, from: 1, to: 1, originalChapter: 21, originalFrom: 37, originalTo: 37 },
    { book: 'EXO', chapter: 22, from: 2, to: 31, originalChapter: 22, originalFrom: 1, originalTo: 30 },
    { book: 'EZK', chapter: 20, from: 45, to: 46, originalChapter: 21, originalFrom: 1, originalTo: 2 },
    { book: 'EZK', chapter: 20, from: 47, to: 47, originalChapter: 21, originalFrom: 3, originalTo: 3 },
    { book: 'EZK', chapter: 20, from: 48, to: 49, originalChapter: 21, originalFrom: 4, originalTo: 5 },
    { book: 'EZK', chapter: 21, from: 1, to: 32, originalChapter: 21, originalFrom: 6, originalTo: 37 },
    { book: 'GEN', chapter: 31, from: 55, to: 55, originalChapter: 32, originalFrom: 1, originalTo: 1 },
    { book: 'GEN', chapter: 32, from: 1, to: 32, originalChapter: 32, originalFrom: 2, originalTo: 33 },
    { book: 'HOS', chapter: 1, from: 10, to: 11, originalChapter: 2, originalFrom: 1, originalTo: 2 },
    { book: 'HOS', chapter: 2, from: 1, to: 23, originalChapter: 2, originalFrom: 3, originalTo: 25 },
    { book: 'HOS', chapter: 11, from: 12, to: 12, originalChapter: 12, originalFrom: 1, originalTo: 1 },
    { book: 'HOS', chapter: 12, from: 1, to: 14, originalChapter: 12, originalFrom: 2, originalTo: 15 },
    { book: 'HOS', chapter: 13, from: 16, to: 16, originalChapter: 14, originalFrom: 1, originalTo: 1 },
    { book: 'HOS', chapter: 14, from: 1, to: 9, originalChapter: 14, originalFrom: 2, originalTo: 10 },
    { book: 'ISA', chapter: 9, from: 1, to: 1, originalChapter: 8, originalFrom: 23, originalTo: 23 },
    { book: 'ISA', chapter: 9, from: 2, to: 21, originalChapter: 9, originalFrom: 1, originalTo: 20 },
    { book: 'ISA', chapter: 64, from: 2, to: 12, originalChapter: 64, originalFrom: 1, originalTo: 11 },
    { book: 'JER', chapter: 9, from: 1, to: 1, originalChapter: 8, originalFrom: 23, originalTo: 23 },
    { book: 'JER', chapter: 9, from: 2, to: 26, originalChapter: 9, originalFrom: 1, originalTo: 25 },
    { book: 'JOB', chapter: 41, from: 1, to: 8, originalChapter: 40, originalFrom: 25, originalTo: 32 },
    { book: 'JOB', chapter: 41, from: 9, to: 34, originalChapter: 41, originalFrom: 1, originalTo: 26 },
    { book: 'JOL', chapter: 2, from: 28, to: 32, originalChapter: 3, originalFrom: 1, originalTo: 5 },
    { book: 'JOL', chapter: 3, from: 1, to: 21, originalChapter: 4, originalFrom: 1, originalTo: 21 },
    { book: 'JON', chapter: 1, from: 17, to: 17, originalChapter: 2, originalFrom: 1, originalTo: 1 },
    { book: 'JON', chapter: 2, from: 1, to: 10, originalChapter: 2, originalFrom: 2, originalTo: 11 },
    { book: 'LEV', chapter: 6, from: 1, to: 7, originalChapter: 5, originalFrom: 20, originalTo: 26 },
    { book: 'LEV', chapter: 6, from: 8, to: 30, originalChapter: 6, originalFrom: 1, originalTo: 23 },
    { book: 'MAL', chapter: 4, from: 1, to: 6, originalChapter: 3, originalFrom: 19, originalTo: 24 },
    { book: 'MIC', chapter: 5, from: 1, to: 1, originalChapter: 4, originalFrom: 14, originalTo: 14 },
    { book: 'MIC', chapter: 5, from: 2, to: 15, originalChapter: 5, originalFrom: 1, originalTo: 14 },
    { book: 'NAM', chapter: 1, from: 15, to: 15, originalChapter: 2, originalFrom: 1, originalTo: 1 },
    { book: 'NAM', chapter: 2, from: 1, to: 13, originalChapter: 2, originalFrom: 2, originalTo: 14 },
    { book: 'NEH', chapter: 4, from: 1, to: 6, originalChapter: 3, originalFrom: 33, originalTo: 38 },
    { book: 'NEH', chapter: 4, from: 7, to: 23, originalChapter: 4, originalFrom: 1, originalTo: 17 },
    { book: 'NEH', chapter: 7, from: 69, to: 73, originalChapter: 7, originalFrom: 68, originalTo: 72 },
    { book: 'NEH', chapter: 9, from: 38, to: 38, originalChapter: 10, originalFrom: 1, originalTo: 1 },
    { book: 'NEH', chapter: 10, from: 1, to: 39, originalChapter: 10, originalFrom: 2, originalTo: 40 },
    { book: 'NUM', chapter: 16, from: 36, to: 50, originalChapter: 17, originalFrom: 1, originalTo: 15 },
    { book: 'NUM', chapter: 17, from: 1, to: 13, originalChapter: 17, originalFrom: 16, originalTo: 28 },
    { book: 'NUM', chapter: 29, from: 40, to: 40, originalChapter: 30, originalFrom: 1, originalTo: 1 },
    { book: 'NUM', chapter: 30, from: 1, to: 16, originalChapter: 30, originalFrom: 2, originalTo: 17 },
    { book: 'PSA', chapter: 3, from: 0, to: 8, originalChapter: 3, originalFrom: 1, originalTo: 9 },
    { book: 'PSA', chapter: 4, from: 0, to: 8, originalChapter: 4, originalFrom: 1, originalTo: 9 },
    { book: 'PSA', chapter: 5, from: 0, to: 12, originalChapter: 5, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 6, from: 0, to: 10, originalChapter: 6, originalFrom: 1, originalTo: 11 },
    { book: 'PSA', chapter: 7, from: 0, to: 17, originalChapter: 7, originalFrom: 1, originalTo: 18 },
    { book: 'PSA', chapter: 8, from: 0, to: 9, originalChapter: 8, originalFrom: 1, originalTo: 10 },
    { book: 'PSA', chapter: 9, from: 0, to: 20, originalChapter: 9, originalFrom: 1, originalTo: 21 },
    { book: 'PSA', chapter: 12, from: 0, to: 8, originalChapter: 12, originalFrom: 1, originalTo: 9 },
    { book: 'PSA', chapter: 13, from: 0, to: 5, originalChapter: 13, originalFrom: 1, originalTo: 6 },
    { book: 'PSA', chapter: 18, from: 0, to: 50, originalChapter: 18, originalFrom: 1, originalTo: 51 },
    { book: 'PSA', chapter: 19, from: 0, to: 14, originalChapter: 19, originalFrom: 1, originalTo: 15 },
    { book: 'PSA', chapter: 20, from: 0, to: 9, originalChapter: 20, originalFrom: 1, originalTo: 10 },
    { book: 'PSA', chapter: 21, from: 0, to: 13, originalChapter: 21, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 22, from: 0, to: 31, originalChapter: 22, originalFrom: 1, originalTo: 32 },
    { book: 'PSA', chapter: 30, from: 0, to: 12, originalChapter: 30, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 31, from: 0, to: 24, originalChapter: 31, originalFrom: 1, originalTo: 25 },
    { book: 'PSA', chapter: 34, from: 0, to: 22, originalChapter: 34, originalFrom: 1, originalTo: 23 },
    { book: 'PSA', chapter: 36, from: 0, to: 12, originalChapter: 36, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 38, from: 0, to: 22, originalChapter: 38, originalFrom: 1, originalTo: 23 },
    { book: 'PSA', chapter: 39, from: 0, to: 13, originalChapter: 39, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 40, from: 0, to: 17, originalChapter: 40, originalFrom: 1, originalTo: 18 },
    { book: 'PSA', chapter: 41, from: 0, to: 13, originalChapter: 41, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 42, from: 0, to: 11, originalChapter: 42, originalFrom: 1, originalTo: 12 },
    { book: 'PSA', chapter: 44, from: 0, to: 26, originalChapter: 44, originalFrom: 1, originalTo: 27 },
    { book: 'PSA', chapter: 45, from: 0, to: 17, originalChapter: 45, originalFrom: 1, originalTo: 18 },
    { book: 'PSA', chapter: 46, from: 0, to: 11, originalChapter: 46, originalFrom: 1, originalTo: 12 },
    { book: 'PSA', chapter: 47, from: 0, to: 9, originalChapter: 47, originalFrom: 1, originalTo: 10 },
    { book: 'PSA', chapter: 48, from: 0, to: 14, originalChapter: 48, originalFrom: 1, originalTo: 15 },
    { book: 'PSA', chapter: 49, from: 0, to: 20, originalChapter: 49, originalFrom: 1, originalTo: 21 },
    { book: 'PSA', chapter: 51, from: 0, to: 0, originalChapter: 51, originalFrom: 2, originalTo: 2 },
    { book: 'PSA', chapter: 51, from: 1, to: 19, originalChapter: 51, originalFrom: 3, originalTo: 21 },
    { book: 'PSA', chapter: 52, from: 0, to: 0, originalChapter: 52, originalFrom: 2, originalTo: 2 },
    { book: 'PSA', chapter: 52, from: 1, to: 9, originalChapter: 52, originalFrom: 3, originalTo: 11 },
    { book: 'PSA', chapter: 53, from: 0, to: 6, originalChapter: 53, originalFrom: 1, originalTo: 7 },
    { book: 'PSA', chapter: 54, from: 0, to: 0, originalChapter: 54, originalFrom: 2, originalTo: 2 },
    { book: 'PSA', chapter: 54, from: 1, to: 7, originalChapter: 54, originalFrom: 3, originalTo: 9 },
    { book: 'PSA', chapter: 55, from: 0, to: 23, originalChapter: 55, originalFrom: 1, originalTo: 24 },
    { book: 'PSA', chapter: 56, from: 0, to: 13, originalChapter: 56, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 57, from: 0, to: 11, originalChapter: 57, originalFrom: 1, originalTo: 12 },
    { book: 'PSA', chapter: 58, from: 0, to: 11, originalChapter: 58, originalFrom: 1, originalTo: 12 },
    { book: 'PSA', chapter: 59, from: 0, to: 17, originalChapter: 59, originalFrom: 1, originalTo: 18 },
    { book: 'PSA', chapter: 60, from: 0, to: 0, originalChapter: 60, originalFrom: 2, originalTo: 2 },
    { book: 'PSA', chapter: 60, from: 1, to: 12, originalChapter: 60, originalFrom: 3, originalTo: 14 },
    { book: 'PSA', chapter: 61, from: 0, to: 8, originalChapter: 61, originalFrom: 1, originalTo: 9 },
    { book: 'PSA', chapter: 62, from: 0, to: 12, originalChapter: 62, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 63, from: 0, to: 11, originalChapter: 63, originalFrom: 1, originalTo: 12 },
    { book: 'PSA', chapter: 64, from: 0, to: 10, originalChapter: 64, originalFrom: 1, originalTo: 11 },
    { book: 'PSA', chapter: 65, from: 0, to: 13, originalChapter: 65, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 67, from: 0, to: 7, originalChapter: 67, originalFrom: 1, originalTo: 8 },
    { book: 'PSA', chapter: 68, from: 0, to: 35, originalChapter: 68, originalFrom: 1, originalTo: 36 },
    { book: 'PSA', chapter: 69, from: 0, to: 36, originalChapter: 69, originalFrom: 1, originalTo: 37 },
    { book: 'PSA', chapter: 70, from: 0, to: 5, originalChapter: 70, originalFrom: 1, originalTo: 6 },
    { book: 'PSA', chapter: 75, from: 0, to: 10, originalChapter: 75, originalFrom: 1, originalTo: 11 },
    { book: 'PSA', chapter: 76, from: 0, to: 12, originalChapter: 76, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 77, from: 0, to: 20, originalChapter: 77, originalFrom: 1, originalTo: 21 },
    { book: 'PSA', chapter: 80, from: 0, to: 19, originalChapter: 80, originalFrom: 1, originalTo: 20 },
    { book: 'PSA', chapter: 81, from: 0, to: 16, originalChapter: 81, originalFrom: 1, originalTo: 17 },
    { book: 'PSA', chapter: 83, from: 0, to: 18, originalChapter: 83, originalFrom: 1, originalTo: 19 },
    { book: 'PSA', chapter: 84, from: 0, to: 12, originalChapter: 84, originalFrom: 1, originalTo: 13 },
    { book: 'PSA', chapter: 85, from: 0, to: 13, originalChapter: 85, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 88, from: 0, to: 18, originalChapter: 88, originalFrom: 1, originalTo: 19 },
    { book: 'PSA', chapter: 89, from: 0, to: 52, originalChapter: 89, originalFrom: 1, originalTo: 53 },
    { book: 'PSA', chapter: 92, from: 0, to: 15, originalChapter: 92, originalFrom: 1, originalTo: 16 },
    { book: 'PSA', chapter: 102, from: 0, to: 28, originalChapter: 102, originalFrom: 1, originalTo: 29 },
    { book: 'PSA', chapter: 108, from: 0, to: 13, originalChapter: 108, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 140, from: 0, to: 13, originalChapter: 140, originalFrom: 1, originalTo: 14 },
    { book: 'PSA', chapter: 142, from: 0, to: 7, originalChapter: 142, originalFrom: 1, originalTo: 8 },
    { book: 'SNG', chapter: 6, from: 13, to: 13, originalChapter: 7, originalFrom: 1, originalTo: 1 },
    { book: 'SNG', chapter: 7, from: 1, to: 13, originalChapter: 7, originalFrom: 2, originalTo: 14 },
    { book: 'ZEC', chapter: 1, from: 18, to: 21, originalChapter: 2, originalFrom: 1, originalTo: 4 },
    { book: 'ZEC', chapter: 2, from: 1, to: 13, originalChapter: 2, originalFrom: 5, originalTo: 17 },
];

/** Libros donde las dos versificaciones difieren en algún punto. */
export const BOOKS_WITH_VERSIFICATION_DIFFERENCES: ReadonlyArray<BibleBookId> = [
    '1CH',
    '1KI',
    '1SA',
    '2CH',
    '2KI',
    '2SA',
    'DAN',
    'DEU',
    'ECC',
    'EXO',
    'EZK',
    'GEN',
    'HOS',
    'ISA',
    'JER',
    'JOB',
    'JOL',
    'JON',
    'LEV',
    'MAL',
    'MIC',
    'NAM',
    'NEH',
    'NUM',
    'PSA',
    'SNG',
    'ZEC',
];
