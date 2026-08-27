import type { AssistantVerseInput } from '@dosfilos/domain';

/** De dónde salió el texto que se está analizando. */
export type ExpositorySourceLanguage = 'greek' | 'hebrew' | 'translation';

export interface PassInputBase {
    book: string;
    displayLanguage: 'es' | 'en';
    verses: AssistantVerseInput[];
    sourceLanguage?: ExpositorySourceLanguage;
    scopeKey?: string;
    targetPreachableCount?: number;
}

/**
 * EL INPUT COMÚN DE LOS CINCO PASES, ARMADO EN UN SOLO LUGAR.
 *
 * Estaba escrito tres veces en la página —al iniciar el análisis, al refinar y
 * en el modo estricto— y las tres copias NO ERAN IGUALES. Las diferencias no se
 * veían porque cada una vivía a cuatrocientas líneas de la siguiente.
 *
 * DOS DE ELLAS ERAN ERRORES:
 *
 * 1. El camino de refinar mandaba `sourceLanguage: lang === 'es' ? 'es' : 'en'`
 *    — el idioma de SALIDA del paper, no el del texto analizado. Y `'es'`/`'en'`
 *    ni siquiera están en el contrato, que admite `greek | hebrew |
 *    translation`. El prompt usa ese dato para saber si puede citar sintaxis
 *    directamente (griego/hebreo) o si debe aproximar los marcadores desde una
 *    traducción: con un valor que no reconoce, refinar perdía esa información.
 *
 * 2. Ni refinar ni el modo estricto pasaban `scopeKey`, que es lo que marca que
 *    los versículos son un FRAGMENTO. Sin él, el envoltorio con caché puede
 *    devolver el panorama del libro entero — un refinamiento sobre "Mateo 10"
 *    respondido con lo cacheado de "Mateo 1-28".
 *
 * LAS CLAVES OPCIONALES SE OMITEN en vez de viajar como `undefined`: el contrato
 * distingue "no se dice nada" de "se dice que no hay", y el comportamiento
 * heredado depende de esa diferencia.
 */
export function buildPassInput(input: {
    book: string;
    displayLanguage: 'es' | 'en';
    verses: AssistantVerseInput[];
    sourceLanguage?: ExpositorySourceLanguage;
    scopeKey?: string;
    /** El campo del formulario: puede venir vacío mientras no se escriba nada. */
    targetPreachableCount?: number | '';
}): PassInputBase {
    return {
        book: input.book,
        displayLanguage: input.displayLanguage,
        verses: input.verses,
        ...(input.sourceLanguage ? { sourceLanguage: input.sourceLanguage } : {}),
        ...(input.scopeKey ? { scopeKey: input.scopeKey } : {}),
        ...(typeof input.targetPreachableCount === 'number'
            ? { targetPreachableCount: input.targetPreachableCount }
            : {}),
    };
}

/**
 * Traduce de dónde vinieron los versículos al valor que entiende el prompt.
 *
 * El cargador dice `original-greek` / `original-hebrew` / otra cosa; el contrato
 * de los pases habla de `greek` / `hebrew` / `translation`. Cualquier origen que
 * no sea uno de los dos originales ES una traducción — incluido un origen nuevo
 * que todavía no exista: es la respuesta segura, porque hace que el prompt
 * APROXIME en vez de citar sintaxis que quizá no está.
 */
export function sourceLanguageFromLoaded(source: string | undefined): ExpositorySourceLanguage {
    if (source === 'original-greek') return 'greek';
    if (source === 'original-hebrew') return 'hebrew';
    return 'translation';
}
