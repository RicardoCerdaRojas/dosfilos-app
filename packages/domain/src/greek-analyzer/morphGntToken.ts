/**
 * Tokens del Nuevo Testamento griego según MorphGNT (morphgnt/sblgnt).
 *
 * LA MORFOLOGÍA DEL GRIEGO ES DETERMINISTA: viene columna por columna en el
 * archivo que ya se descarga para el texto — no se le pide a un modelo. El
 * analizador hebreo pide la morfología al LLM y la valida contra OSHB; acá el
 * dato ya viene validado de origen, así que el LLM (fase 2) sólo aporta lo que
 * NO es calculable: rango semántico, función sintáctica y traducciones.
 *
 * Los campos llevan los CÓDIGOS de MorphGNT, tipados. La UI los traduce por
 * i18n — el dominio no habla ningún idioma de pantalla.
 */

/** Categoría gramatical (columna `pos` de MorphGNT). */
export type GreekPos =
    | 'N'   // sustantivo
    | 'V'   // verbo
    | 'A'   // adjetivo
    | 'D'   // adverbio
    | 'P'   // preposición
    | 'C'   // conjunción
    | 'X'   // partícula
    | 'I'   // interjección
    | 'RA'  // artículo
    | 'RP'  // pronombre personal
    | 'RR'  // pronombre relativo
    | 'RD'  // pronombre demostrativo
    | 'RI'; // pronombre interrogativo/indefinido

export type GreekPerson = '1' | '2' | '3';
export type GreekTense = 'P' | 'I' | 'F' | 'A' | 'X' | 'Y';
export type GreekVoice = 'A' | 'M' | 'P';
export type GreekMood = 'I' | 'D' | 'S' | 'O' | 'N' | 'P';
export type GreekCase = 'N' | 'G' | 'D' | 'A' | 'V';
export type GreekNumber = 'S' | 'P';
export type GreekGender = 'M' | 'F' | 'N';
export type GreekDegree = 'C' | 'S';

/** Las ocho posiciones del código de parsing, ya separadas y tipadas. */
export interface GreekMorphTag {
    readonly person?: GreekPerson;
    readonly tense?: GreekTense;
    readonly voice?: GreekVoice;
    readonly mood?: GreekMood;
    readonly case?: GreekCase;
    readonly number?: GreekNumber;
    readonly gender?: GreekGender;
    readonly degree?: GreekDegree;
}

/** Una palabra del texto griego con su análisis morfológico de MorphGNT. */
export interface GreekWordToken {
    /** Forma superficial, con acentos y puntuación — lo que se lee. */
    readonly text: string;
    /** Lema (forma de diccionario). */
    readonly lemma: string;
    readonly pos: GreekPos;
    readonly tag: GreekMorphTag;
    /** Transliteración académica, derivada por código (no por modelo). */
    readonly transliteration: string;
}

/** Un versículo completo: su texto corrido y sus palabras analizadas. */
export interface GreekVerseTokens {
    readonly reference: { readonly chapter: number; readonly verse: number };
    readonly text: string;
    readonly tokens: readonly GreekWordToken[];
}
