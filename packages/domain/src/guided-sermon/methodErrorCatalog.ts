/**
 * Catálogo ÚNICO de detección de error de método — una sola vara para las dos
 * superficies del spine de 8 pasos (el acompañante socrático del chat y el
 * wizard del menú "Nuevo Sermón").
 *
 * POR QUÉ EXISTE: la misma pregunta pedagógica —¿el pastor leyó el género
 * equivocado, se saltó la estructura, saltó a aplicación moderna?— estaba
 * respondida en dos lugares, con dos formas distintas, contra dos callables
 * distintos. Dos implementaciones de una misma regla derivan; la única defensa
 * es que la regla viva una vez.
 *
 * DECISIÓN DEL FUNDADOR (2026-08-21) — QUÉ BLOQUEA Y QUÉ NO:
 *
 *   - LO DETERMINISTA BLOQUEA. Los validadores de umbral de `PastoralSeed`
 *     (mínimos de caracteres, cantidad de estudios, de paralelos) gatillan el
 *     avance en AMBAS superficies. Eso no cambia.
 *   - EL ERROR DE MÉTODO NO BLOQUEA, EN NINGUNA DE LAS DOS. Se muestra, y el
 *     pastor decide. Antes el chat hacía short-circuit y trababa el turno con
 *     esto; ya no.
 *   - PERO APARECE SOLO, EN AMBAS. No espera a que el pastor lo pida. Antes el
 *     wizard solo confrontaba si el pastor abría el acompañante.
 *
 * POR QUÉ NO BLOQUEA: lo que hay acá abajo es coincidencia de palabras, no
 * juicio. Un falso positivo en un chat cuesta un turno —el pastor responde y
 * sigue—; en un formulario, sin recuperación conversacional, costaría un MURO
 * levantado por una lista de keywords. Y Preach es maestro, no examinador: el
 * juicio fino lo hace el LLM en su turno, y la vara dura la ponen los
 * validadores.
 *
 * DATO EDITABLE (SSOT domain). Las heurísticas son deliberadamente CONSERVADORAS
 * y TOSCAS: son un atajo barato y local que no gasta LLM, no la red fina.
 */

import type { PastoralSeedStepKey } from '../entities/PastoralSeed';
import type { MethodErrorReport } from './SocraticTurn';

/**
 * Piso de confianza para SURFACEAR una detección. No es un piso para bloquear
 * — ya nada bloquea con esto.
 */
export const METHOD_ERROR_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Lo mínimo que un detector necesita saber del contexto. A propósito NO es
 * `TurnContext`: ese tipo es del chat (trae `attemptIndex`, historial de turnos)
 * y pedirlo dejaría al wizard fuera del catálogo, que es justo lo que se viene
 * a arreglar.
 */
export interface MethodErrorContext {
    /** Género confirmado del pasaje, si lo hay. */
    genre?: string;
}

export type MethodErrorDetector = (
    pastorText: string,
    ctx: MethodErrorContext,
) => MethodErrorReport | null;

/**
 * Caso UC3: el pastor escribe "es profecía" / "como apocalipsis" mientras el
 * pasaje es evangelio o carta. Conservador a propósito — el LLM confronta más
 * ampliamente desde el prompt.
 */
const GENRE_MISMATCH_KEYWORDS: Record<string, string[]> = {
    evangelio: ['profecía', 'profeta', 'apocalipsis', 'predice', 'predicción', 'cumplirá', 'tribulación'],
    carta: ['profecía', 'apocalipsis', 'narrativa histórica'],
    'sabiduría': ['profecía', 'predicción literal'],
    'poesía': ['cronología literal', 'narrativa histórica'],
};

/** Léxico/morfología es el paso 4; en el paso 3 se analiza ESTRUCTURA. */
const LEXICAL_LEAKAGE_KEYWORDS = [
    'predicado nominal',
    'sin artículo',
    'morfología',
    'morfema',
    'lexema',
    'genitivo',
    'acusativo',
    'dativo',
    'vocativo',
];

/** Saltar a la aplicación de hoy antes de anclar la función original. */
const MODERN_LEAP_KEYWORDS = [
    'me dice a mí',
    'aplicado hoy',
    'aplicación moderna',
    'para nuestra iglesia',
    'en nuestros tiempos',
    'la sociedad actual',
];

const detectGenreMismatch: MethodErrorDetector = (pastorText, ctx) => {
    const genre = (ctx.genre ?? '').toLowerCase();
    if (!genre) return null;
    const matchedFamily = Object.keys(GENRE_MISMATCH_KEYWORDS).find(k => genre.includes(k));
    if (!matchedFamily) return null;
    const flagged = GENRE_MISMATCH_KEYWORDS[matchedFamily]!;
    const lower = pastorText.toLowerCase();
    const hit = flagged.find(kw => lower.includes(kw));
    if (!hit) return null;
    return {
        label: 'genre-mismatch',
        description: `El pastor usa lenguaje propio de un género distinto (palabra detectada: "${hit}") mientras el pasaje es ${matchedFamily}.`,
        confidence: 0.75,
    };
};

const detectLexicalLeakage: MethodErrorDetector = (pastorText) => {
    const lower = pastorText.toLowerCase();
    const hit = LEXICAL_LEAKAGE_KEYWORDS.find(kw => lower.includes(kw));
    if (!hit) return null;
    return {
        label: 'lexical-leakage',
        description: `El pastor menciona "${hit}", que es léxico/morfología (paso 4), no estructura.`,
        confidence: 0.7,
    };
};

const detectModernLeap: MethodErrorDetector = (pastorText) => {
    const lower = pastorText.toLowerCase();
    const hit = MODERN_LEAP_KEYWORDS.find(kw => lower.includes(kw));
    if (!hit) return null;
    return {
        label: 'modern-application-leap',
        description: `El pastor salta a aplicación moderna ("${hit}") antes de anclar la función original del texto.`,
        confidence: 0.7,
    };
};

/**
 * Los pasos con detector heurístico. Un paso ausente NO significa "acá no se
 * confronta": significa que no hay atajo local barato y el juicio queda en manos
 * del LLM, que sí confronta en TODOS los pasos desde su prompt.
 */
export const METHOD_ERROR_DETECTORS: Partial<Record<PastoralSeedStepKey, MethodErrorDetector>> = {
    contextGenre: detectGenreMismatch,
    structuralAnalysis: detectLexicalLeakage,
    function: detectModernLeap,
};

/**
 * Detección para un paso. Devuelve `null` si el paso no tiene detector, si el
 * texto está vacío o si la confianza no llega al piso — nunca inventa hallazgo.
 */
export function detectMethodErrorForStep(
    step: PastoralSeedStepKey,
    pastorText: string,
    ctx: MethodErrorContext = {},
): MethodErrorReport | null {
    if (!pastorText?.trim()) return null;
    const detector = METHOD_ERROR_DETECTORS[step];
    if (!detector) return null;
    const report = detector(pastorText, ctx);
    if (!report) return null;
    return report.confidence >= METHOD_ERROR_CONFIDENCE_THRESHOLD ? report : null;
}

/** Pasos con atajo heurístico local (para tests de paridad y para la UI). */
export const STEPS_WITH_METHOD_ERROR_HEURISTIC = Object.keys(
    METHOD_ERROR_DETECTORS,
) as PastoralSeedStepKey[];
