/**
 * Phase 2.5 PR B (ADR-028) — Shared helpers for step policies.
 *
 * DRY between the 8 step policies. Keep this file PURE (no I/O, no
 * domain-extending logic — only common parsers + base prompt fragments
 * + generic helpers).
 */

import type { SocraticTurnOutput, TurnContext } from '../SocraticTurn';

/**
 * Core P1/P2/P3 guards every policy injects into its system prompt. The
 * concrete policy appends step-specific instructions on top of this.
 */
export const BASE_SYSTEM_GUARDS = `Eres el Acompañante Socrático de Sermones de Preach. El pastor está construyendo su sermón paso a paso. Tu rol es ORIENTAR + CONFRONTAR — NUNCA escribir su respuesta.

Reglas inviolables:
- Datos + preguntas socráticas. Nada de redactar la idea, el principio, la observación o la conclusión por él.
- Si detectás error de método (género equivocado, regla de lectura inconsistente con el género, error estructural, salto exegético): nombralo y devolvelo como pregunta. NUNCA des la respuesta correcta.
- NO te metés en interpretaciones doctrinales legítimamente abiertas entre tradiciones fieles — eso no es error de método.
- Si no tenés una fuente real para un dato de trasfondo, decilo; NUNCA inventes citas.
- Tono pastoral, español neutral latinoamericano, "tú". Breve.

Devolvés SIEMPRE JSON válido (sin Markdown) con este esquema:
{
  "kind": "accepted" | "orient" | "confront",
  "agentReply": "mensaje pastoral breve que verá el usuario",
  // si "accepted":
  "pastorTextToPersist": "texto a persistir (VACÍO si el paso es AI-forbidden de generación — usa el del pastor verbatim)",
  // si "orient":
  "reason": "frase breve interna de por qué no aceptaste",
  "data": ["1-3 datos factuales relevantes"],
  "questions": ["1-3 preguntas socráticas"],
  "caution": "opcional",
  // si "confront":
  "errorLabel": "etiqueta corta (ej. genre-mismatch)",
  "data": ["datos que sostienen la confrontación"],
  "questions": ["preguntas que reformulan el error"]
}`;

/** Permissive JSON extractor — handles ```json fences + leading/trailing prose. */
export function safeParseJson(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) {
        throw new Error('Respuesta del agente sin JSON detectable.');
    }
    return JSON.parse(cleaned.substring(first, last + 1));
}

export function toStringArray(value: unknown, max = 3): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((v) => String(v ?? '').trim())
        .filter((s) => s.length > 0)
        .slice(0, max);
}

/**
 * Standard parser shared by most policies. Translates raw LLM JSON into
 * a typed `SocraticTurnOutput`. AI-forbidden generation steps OVERRIDE the
 * `pastorTextToPersist` to the pastor's verbatim message regardless of what
 * the LLM tried to put there.
 */
export function parseStandardLlmReply(
    raw: string,
    pastorMessage: string,
    options: { aiGenerationForbidden: boolean },
): SocraticTurnOutput {
    const parsed = safeParseJson(raw);
    const kind = String(parsed.kind ?? '').trim();
    const agentReply = String(parsed.agentReply ?? '').trim();

    if (kind === 'accepted') {
        // Hard guard: for AI-forbidden steps the persisted text is ALWAYS
        // the pastor's message. We never let the LLM smuggle generated
        // content into the seed.
        const pastorTextToPersist = options.aiGenerationForbidden
            ? pastorMessage.trim()
            : String(parsed.pastorTextToPersist ?? pastorMessage).trim();
        return {
            kind: 'accepted',
            pastorTextToPersist,
            agentReply: agentReply || 'Avanzamos.',
        };
    }
    if (kind === 'confront') {
        return {
            kind: 'confront',
            errorLabel: String(parsed.errorLabel ?? 'method-error').trim(),
            agentReply: agentReply || 'Revisemos tu método.',
            data: toStringArray(parsed.data),
            questions: toStringArray(parsed.questions),
        };
    }
    // Default: treat anything else as orient.
    return {
        kind: 'orient',
        reason: String(parsed.reason ?? 'insufficient').trim(),
        agentReply: agentReply || 'Profundicemos un poco.',
        data: toStringArray(parsed.data),
        questions: toStringArray(parsed.questions),
        caution: parsed.caution ? String(parsed.caution).trim() : undefined,
    };
}

/** Pastor draft summary block for system prompts (compact). */
export function priorStepsBlock(ctx: TurnContext): string {
    const prior = ctx.priorSteps ?? {};
    const lines: string[] = [];
    for (const [step, text] of Object.entries(prior)) {
        if (!text) continue;
        const trimmed = text.length > 200 ? `${text.slice(0, 200)}…` : text;
        lines.push(`- ${step}: ${trimmed}`);
    }
    if (lines.length === 0) return '(aún no hay trabajo previo del pastor)';
    return lines.join('\n');
}
