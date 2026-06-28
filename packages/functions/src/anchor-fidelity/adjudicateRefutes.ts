import type { ILlmClient } from '../llm/LlmClient';

/**
 * ADR-036 PR3 — adjudicación "¿el ancla REFUTA la lectura errónea?".
 *
 * Cierra la mitad de juicio de presencia → validez (la determinista es PR2,
 * `verifyAnchorVerse`). Reusa el PATRÓN de CA1 (`coverageEngagement`): mismo
 * puerto `ILlmClient`, tier Sonnet, JSON estricto, parse defensivo. La PREGUNTA
 * es distinta — CA1 juzga el engagement del PASTOR; aquí juzgamos si un VERSO
 * contradice un claim — por eso prompt propio, no el mismo.
 *
 * Corre en INGEST/REVISIÓN y se cachea en la entrada (`verification.refutes`).
 * NUNCA en el path runtime del pastor (costo + determinismo del confront).
 *
 * Sesgo CONSERVADOR (fail-closed): `yes` solo si el verso contradice directamente
 * la lectura. Ante mención-del-tema sin contradicción → `no`; ante ambigüedad o
 * inferencia larga → `unclear`. Nunca `yes` por duda. Aguas abajo,
 * `decideAnchorAdmission` solo habilita confrontar con `yes` + revisado.
 *
 * functions NO importa @dosfilos/domain: el verdict espeja `AnchorRefutesVerdict`
 * de packages/domain/src/entities/VerifiedMisreading.ts. Mantener en sync.
 */

export type RefutesVerdict = 'yes' | 'unclear' | 'no';

export interface AdjudicateRefutesInput {
    /** La lectura errónea a refutar. */
    claim: string;
    /** Por qué se considera errónea (contexto del curador). */
    whyWrong?: string;
    /** Referencia del ancla (para el prompt; la existencia la valida PR2). */
    anchorReference: string;
    /** TEXTO del verso ancla (resuelto por el repo, no redactado por el LLM). */
    anchorVerseText: string;
}

export interface RefutesAdjudication {
    refutes: RefutesVerdict;
    reasoning: string;
}

const SYSTEM_PROMPT = `Eres un evaluador teológico riguroso. Tu ÚNICA tarea: dado una LECTURA ERRÓNEA (claim) y el TEXTO de un verso bíblico (ancla), juzgar si el verso REFUTA esa lectura.

Definiciones estrictas:
- refutes = "yes" SOLO si el texto del verso CONTRADICE o DESMIENTE directamente la lectura errónea: leyendo el verso, la lectura queda mostrada como falsa.
- refutes = "no" si el verso NO toca la lectura, o solo MENCIONA el mismo tema sin contradecirla (mención ≠ refutación), o incluso podría leerse como compatible con ella.
- refutes = "unclear" si refutar requiere una cadena de inferencia larga, contexto externo, o el verso es ambiguo respecto a la lectura.

REGLA CONSERVADORA (crítica): ante cualquier duda, responde "unclear" o "no", NUNCA "yes". Un "yes" afirma que este verso, por sí solo, basta para confrontar a un pastor — solo dilo cuando la contradicción sea directa e innegable.

Juzga SOLO la relación verso↔lectura, no si la lectura es popular o peligrosa. Respondes SOLO con JSON válido.`;

function buildPrompt(input: AdjudicateRefutesInput): string {
    const why = input.whyWrong?.trim() ? `\nPor qué se considera errónea: ${input.whyWrong.trim()}` : '';
    return `Lectura errónea (claim): "${input.claim}"${why}

Verso ancla: ${input.anchorReference}
Texto del verso:
"""
${input.anchorVerseText}
"""

¿El TEXTO de este verso refuta directamente la lectura errónea?

Devuelve JSON con esta forma EXACTA:
{ "refutes": "yes" | "unclear" | "no", "reasoning": "<una frase breve>" }

Recuerda la regla conservadora: ante duda, "unclear" o "no", nunca "yes".`;
}

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta del modelo sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

/** Parsea la salida cruda a un verdict válido. Default conservador: `unclear`. */
export function parseRefutes(raw: string): RefutesAdjudication {
    const parsed = safeParseJson(raw) as Record<string, unknown>;
    const v = String(parsed?.refutes ?? '').trim().toLowerCase();
    const refutes: RefutesVerdict = v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unclear';
    const reasoning = String(parsed?.reasoning ?? '').trim();
    return { refutes, reasoning };
}

/**
 * Adjudica si el ancla refuta el claim. Tier Sonnet (el `client` inyectado lo
 * decide; el callable pasa Anthropic). Temperatura baja para estabilidad.
 *
 * Fail-closed de entrada: sin texto de verso no se puede juzgar refutación →
 * `no` (no asumir; la existencia la garantiza PR2 antes de llamar aquí).
 */
export async function adjudicateRefutes(
    client: ILlmClient,
    input: AdjudicateRefutesInput,
): Promise<RefutesAdjudication> {
    if (!input.anchorVerseText.trim() || !input.claim.trim()) {
        return { refutes: 'no', reasoning: 'Sin texto de verso o sin claim: no se puede juzgar refutación.' };
    }
    const raw = await client.generate({
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(input),
        responseMimeType: 'application/json',
        temperature: 0.1,
    });
    return parseRefutes(raw);
}
