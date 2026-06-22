import type { ILlmClient } from '../llm/LlmClient';

/**
 * ADR-035 CA1 — juicio de ENGAGEMENT del confront de `common-misreading`.
 *
 * EL CORAZÓN DE LA TESIS: el LLM (tier Sonnet, decisión cerrada del founder)
 * juzga si el pastor TRABAJÓ el ancla correctiva, NO si su conclusión es
 * correcta. Produce dos booleanos; la sustancia es un gate DETERMINISTA de largo
 * (se compone con el GATE-MÍNIMO, CA2). La DECISIÓN (accept/re-confront/override)
 * vive en el dominio (`decideMisreadingTurn`) — aquí NO se decide nada, solo se
 * juzga.
 *
 * functions NO importa @dosfilos/domain: la forma espeja `MisreadingJudgment` de
 * packages/domain/src/services/misreadingTurn.ts. Mantener en sync.
 */

export interface EngagementInput {
    /** Lo que el pastor escribió en el turno. */
    pastorMessage: string;
    /** La lectura errónea que el perfil señaló. */
    claim: string;
    /** Por qué es errónea (del perfil). */
    whyWrong: string;
    /** Anclas correctivas verificables (referencias) del perfil. */
    correctiveAnchors: string[];
    /** Umbral de sustancia (GATE-MÍNIMO del paso). Default 40. */
    minSubstanceChars?: number;
}

export interface EngagementJudgment {
    /** Pasó el gate de sustancia (largo). Determinista, no LLM. */
    substantive: boolean;
    /** Trabajó el ancla de forma sustantiva, AUNQUE discrepe. */
    engagedAnchor: boolean;
    /** Su postura contradice lo que el ancla establece. */
    contradictsAnchor: boolean;
}

const DEFAULT_MIN_SUBSTANCE = 40;

const SYSTEM_PROMPT = `Eres un evaluador de exégesis. Tu ÚNICA tarea es juzgar si la respuesta de un pastor INTERACTUÓ de forma sustantiva con un "ancla correctiva" (un verso o referencia que refuta una lectura errónea) — NO si su conclusión final es correcta.

Distinción crítica:
- engagedAnchor = true si el pastor NOMBRA o RAZONA sobre el ancla (la cita, la discute, explica qué hace), AUNQUE termine en desacuerdo con ella.
- engagedAnchor = false si el pastor IGNORA el ancla (no la menciona ni razona sobre ella), aunque afirme una conclusión.
- contradictsAnchor = true si la postura final del pastor va en contra de lo que el ancla establece; false si la sostiene o la integra.

NO premies ni castigues por acertar. Un pastor que trabaja el ancla a fondo y AÚN ASÍ discrepa tiene engagedAnchor=true, contradictsAnchor=true. Un pastor que da la conclusión "correcta" sin tocar el ancla tiene engagedAnchor=false.

Respondes SOLO con JSON válido.`;

function buildPrompt(input: EngagementInput): string {
    return `Lectura errónea señalada: "${input.claim}"
Por qué es errónea: ${input.whyWrong}
Anclas correctivas (lo que el pastor debía trabajar): ${input.correctiveAnchors.join(', ')}

Respuesta del pastor:
"""
${input.pastorMessage}
"""

Devuelve JSON con esta forma EXACTA:
{ "engagedAnchor": <true|false>, "contradictsAnchor": <true|false> }

Recuerda: engagedAnchor mide si TRABAJÓ el ancla (aunque discrepe), no si acertó.`;
}

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta del modelo sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

/** Parsea la salida cruda del LLM a los dos booleanos de engagement. */
export function parseEngagement(raw: string): { engagedAnchor: boolean; contradictsAnchor: boolean } {
    const parsed = safeParseJson(raw) as Record<string, unknown>;
    return {
        engagedAnchor: parsed?.engagedAnchor === true,
        contradictsAnchor: parsed?.contradictsAnchor === true,
    };
}

/** Gate de sustancia determinista (largo). Se compone con el GATE-MÍNIMO (CA2). */
export function isSubstantive(message: string, minChars: number = DEFAULT_MIN_SUBSTANCE): boolean {
    return message.trim().length >= minChars;
}

/**
 * Juzga el engagement de un turno. Sustancia primero (determinista, sin LLM);
 * si no es sustantivo, no llama al modelo. CA1 usa tier Sonnet (el `client`
 * inyectado lo decide; el callable pasa Anthropic).
 */
export async function judgeEngagement(
    client: ILlmClient,
    input: EngagementInput,
): Promise<EngagementJudgment> {
    if (!isSubstantive(input.pastorMessage, input.minSubstanceChars ?? DEFAULT_MIN_SUBSTANCE)) {
        return { substantive: false, engagedAnchor: false, contradictsAnchor: false };
    }
    const raw = await client.generate({
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(input),
        responseMimeType: 'application/json',
        temperature: 0.1,
    });
    const { engagedAnchor, contradictsAnchor } = parseEngagement(raw);
    return { substantive: true, engagedAnchor, contradictsAnchor };
}
