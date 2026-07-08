import type { ILlmClient } from '../llm/LlmClient';

/**
 * Redacción v2 Fase 1 (§4.4) — juicio de ENGAGEMENT del discernimiento de género
 * (override socrático, paso 2). Espeja `coverageEngagement.judgeEngagement`.
 *
 * EL LLM (tier Sonnet) juzga si el pastor TRABAJÓ el discernimiento del género de
 * su perícopa — NO si coincide con la propuesta del sistema. Adjudica CONTRA una
 * VARA ESTRUCTURADA (las marcas del género propuesto, `criteria`), no un juicio
 * libre (disciplina 036). Produce los tres booleanos que consume
 * `decideMisreadingTurn` en el dominio + un `verdict` para la sombra.
 *
 * FAIL-CLOSED: si el modelo no adjudica con confianza (o falla el parse), el
 * veredicto es `unclear` y los booleanos se neutralizan (no confronta, no
 * confirma) — la señal va a registro, no cuenta como confirmación ni discrepancia.
 *
 * functions NO importa @dosfilos/domain: la forma de los tres booleanos espeja
 * `GenreEngagementJudgment` de packages/domain/src/ports/IGenreEngagementJudge.ts.
 * Mantener en sync.
 */

export interface GenreEngagementInput {
    /** Lo que el pastor escribió en el turno. */
    pastorMessage: string;
    /** El género que el sistema infirió y propuso (el ancla). */
    proposedGenre: string;
    /** La razón visible de la propuesta. */
    proposalRationale: string;
    /** La vara estructurada del género propuesto (marcas de discernimiento). */
    criteria: string;
    /** Umbral de sustancia (GATE-MÍNIMO del paso). Default 40. */
    minSubstanceChars?: number;
}

export type GenreEngagementVerdict = 'confirmed' | 'discrepancy' | 'unclear';

export interface GenreEngagementJudgment {
    /** Pasó el gate de sustancia (largo). Determinista, no LLM. */
    substantive: boolean;
    /** Trabajó el discernimiento del género propuesto, AUNQUE lea distinto. */
    engagedAnchor: boolean;
    /** Su lectura trata el pasaje como un género distinto al propuesto. */
    contradictsAnchor: boolean;
    /**
     * Señal para la sombra (registro): `confirmed` (mantuvo el género),
     * `discrepancy` (lo lee como otro, trabajándolo), `unclear` (no se pudo
     * adjudicar con confianza → fail-closed, no cuenta ni como confirmación ni
     * como discrepancia).
     */
    verdict: GenreEngagementVerdict;
}

const DEFAULT_MIN_SUBSTANCE = 40;

const SYSTEM_PROMPT = `Eres un evaluador de exégesis. Tu ÚNICA tarea es juzgar si la respuesta de un pastor TRABAJÓ el discernimiento del GÉNERO LITERARIO de su perícopa — NO si coincide con el género que el sistema propuso.

Adjudicas SOLO contra las "marcas del género propuesto" que se te dan (la vara). No inventes criterios.

Distinción crítica:
- engagedProposedGenre = true si el pastor RAZONA sobre cómo leer el pasaje según su género (menciona que argumenta, narra, canta/ora, legisla, etc.), AUNQUE llegue a un género distinto al propuesto.
- engagedProposedGenre = false si NO discierne el género (solo parafrasea o afirma sin razonar sobre la forma del texto).
- readsAsDifferentGenre = true si la lectura del pastor trata el pasaje como un género DISTINTO al propuesto; false si lo lee según el género propuesto.
- confident = true SOLO si tienes evidencia clara en el texto del pastor para ambos juicios; false si el mensaje es ambiguo, demasiado corto en contenido, o no permite adjudicar.

NO premies ni castigues por coincidir con la propuesta. Un pastor que discierne a fondo y AÚN lee otro género tiene engagedProposedGenre=true, readsAsDifferentGenre=true.

Respondes SOLO con JSON válido.`;

function buildPrompt(input: GenreEngagementInput): string {
    return `Género propuesto por el sistema: "${input.proposedGenre}"
Razón de la propuesta: ${input.proposalRationale}
Marcas del género propuesto (la vara — adjudica contra esto):
${input.criteria || '(sin marcas provistas)'}

Respuesta del pastor:
"""
${input.pastorMessage}
"""

Devuelve JSON con esta forma EXACTA:
{ "engagedProposedGenre": <true|false>, "readsAsDifferentGenre": <true|false>, "confident": <true|false> }

Recuerda: mides si TRABAJÓ el discernimiento (aunque lea otro género), no si acertó. Si no puedes adjudicar con evidencia, confident=false.`;
}

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta del modelo sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

/** Parsea la salida cruda del LLM a los tres flags del juicio de género. */
export function parseGenreEngagement(raw: string): {
    engagedAnchor: boolean;
    contradictsAnchor: boolean;
    confident: boolean;
} {
    const parsed = safeParseJson(raw) as Record<string, unknown>;
    return {
        engagedAnchor: parsed?.engagedProposedGenre === true,
        contradictsAnchor: parsed?.readsAsDifferentGenre === true,
        confident: parsed?.confident === true,
    };
}

/** Gate de sustancia determinista (largo). Espeja `isSubstantive` de coverage. */
export function isSubstantive(message: string, minChars: number = DEFAULT_MIN_SUBSTANCE): boolean {
    return message.trim().length >= minChars;
}

/** Judgment fail-closed a `unclear`: no confronta ni confirma, va a registro. */
function unclearJudgment(substantive: boolean): GenreEngagementJudgment {
    return { substantive, engagedAnchor: false, contradictsAnchor: false, verdict: 'unclear' };
}

/**
 * Juzga el engagement del discernimiento de género. Sustancia primero
 * (determinista, sin LLM). FAIL-CLOSED: parse fallido o `confident=false` →
 * `unclear` (booleanos neutralizados → el dominio no confronta; la sombra
 * registra unclear).
 */
export async function judgeGenreEngagement(
    client: ILlmClient,
    input: GenreEngagementInput,
): Promise<GenreEngagementJudgment> {
    if (!isSubstantive(input.pastorMessage, input.minSubstanceChars ?? DEFAULT_MIN_SUBSTANCE)) {
        return unclearJudgment(false);
    }
    let parsed: { engagedAnchor: boolean; contradictsAnchor: boolean; confident: boolean };
    try {
        const raw = await client.generate({
            system: SYSTEM_PROMPT,
            prompt: buildPrompt(input),
            responseMimeType: 'application/json',
            temperature: 0.1,
        });
        parsed = parseGenreEngagement(raw);
    } catch (err) {
        console.warn('[judgeGenreEngagement] parse/LLM failure → fail-closed unclear', err);
        return unclearJudgment(true);
    }
    if (!parsed.confident) return unclearJudgment(true);
    return {
        substantive: true,
        engagedAnchor: parsed.engagedAnchor,
        contradictsAnchor: parsed.contradictsAnchor,
        verdict: parsed.contradictsAnchor ? 'discrepancy' : 'confirmed',
    };
}
