/**
 * Pastoral Fidelity — Phase 3 PR 1 prompt builders for the claim ↔ source
 * fidelity evaluator (ADR-029 Q1).
 *
 * Two prompt shapes:
 *
 *  1. `buildFidelityFlashBatchPrompt` — Gemini Flash, batched over all
 *     markers of a sermon. One call returns one verdict per marker.
 *
 *  2. `buildFidelitySonnetEscalationPrompt` — Claude Sonnet 4.6, single
 *     marker. Run only over verdicts initially classified as `partial` or
 *     `contradicts` by Flash, where finer reasoning is worth the extra cost
 *     (~5× per marker).
 *
 * Persona / language policy (Q5):
 *   - System instruction is **always in English** because LLM benchmarks
 *     consistently show better instruction-following + JSON adherence with
 *     EN system prompts on both providers.
 *   - The `reasoning` field returned to the pastor is rendered **in the
 *     pastor's locale** (passed in `locale`, default `es`). The system
 *     prompt instructs the model to emit `reasoning` in that locale only;
 *     all other JSON keys + verdict labels are English literals.
 *
 * The prompts deliberately quote the chunk's `excerpt` verbatim. The
 * excerpt is already truncated to ≤280 chars upstream
 * (`buildCitationManifest`), so token usage per marker is bounded.
 */

export interface FidelityClaimInput {
    /** `[N]` marker the claim belongs to. */
    marker: number;
    /** Sentence to the left of the marker (Q2 — full sentence, not extracted). */
    claim: string;
    /** Snapshot title — gives the model context about what kind of source it is. */
    sourceTitle: string;
    /** Author snapshot if known. */
    sourceAuthor?: string;
    /** Verbatim excerpt from the cited chunk (≤280 chars per manifest cap). */
    excerpt: string;
}

export interface FidelityPromptOptions {
    /** Locale for the human-facing `reasoning` field. Defaults to Spanish. */
    locale?: 'es' | 'en';
}

export interface BuiltPrompt {
    system: string;
    prompt: string;
}

const BASE_SYSTEM = `You are a pastoral fidelity evaluator for a Spanish-language preaching platform. For each numbered marker in a sermon draft, you are given:
  - the SENTENCE the marker attaches to (the "claim"), and
  - a verbatim EXCERPT from the cited library source.

Your job is to judge, for each marker independently, whether the excerpt actually supports the claim. Output one verdict per marker using EXACTLY one of these four labels:

  - "supports"    — the excerpt clearly affirms the claim or one of its load-bearing elements.
  - "partial"     — the excerpt is on-topic but the support is incomplete: it qualifies the claim, scopes it differently, addresses only part of it, or backs an adjacent point.
  - "unrelated"   — the excerpt does not address the claim. The cited source is off-target.
  - "contradicts" — the excerpt states the opposite of the claim, or rules out what the claim asserts.

Hard rules:
  - Evaluate each marker independently. Do not let one verdict bias another.
  - Stay inside what the excerpt literally says. Do not infer external knowledge about the source.
  - When the excerpt is too short to make a confident call, prefer "partial" over guessing "supports".
  - Bias toward "supports" only when the excerpt would be readable as proof to a critical pastor; bias toward "partial" or "unrelated" otherwise.
  - Confidence is your own self-rated certainty (0..1). Use < 0.6 when the excerpt is ambiguous or the claim is broader than the excerpt's scope.`;

const JSON_SHAPE_FLASH = `Respond with ONLY a JSON object of the form:

{
  "verdicts": [
    {
      "marker": <integer>,
      "verdict": "supports" | "partial" | "unrelated" | "contradicts",
      "reasoning": "<one or two sentences, in the requested locale>",
      "confidence": <number between 0 and 1>
    }
  ]
}

Include exactly one entry per marker provided in the input. Keep the array in the same order as the input. Do not add markdown fences, prose, or commentary outside the JSON.`;

const JSON_SHAPE_SONNET = `Respond with ONLY a JSON object of the form:

{
  "verdict": "supports" | "partial" | "unrelated" | "contradicts",
  "reasoning": "<two to four sentences, in the requested locale, explaining what the excerpt does and does not establish for the claim>",
  "confidence": <number between 0 and 1>
}

Do not add markdown fences, prose, or commentary outside the JSON.`;

/**
 * Build the Gemini Flash batched prompt covering every marker in one call.
 * Cost target ≈ $0.001/marker (ADR-029 §Q1).
 */
export function buildFidelityFlashBatchPrompt(
    claims: ReadonlyArray<FidelityClaimInput>,
    options: FidelityPromptOptions = {},
): BuiltPrompt {
    const locale = options.locale ?? 'es';
    const system = `${BASE_SYSTEM}

The "reasoning" field must be written in ${localeName(locale)}. All other JSON keys and verdict labels remain in English exactly as specified.

${JSON_SHAPE_FLASH}`;

    const prompt = [
        'Markers to evaluate:',
        '',
        ...claims.map((c) => renderClaim(c)),
    ].join('\n');

    return { system, prompt };
}

/**
 * Build the Sonnet 4.6 escalation prompt for a single marker. Used only
 * when the Flash batch returned `partial` or `contradicts` for this marker
 * — the extra reasoning depth is worth the ~5× cost for the marginals
 * the pastor will most care about.
 */
export function buildFidelitySonnetEscalationPrompt(
    claim: FidelityClaimInput,
    flashVerdict: 'partial' | 'contradicts',
    flashReasoning: string,
    options: FidelityPromptOptions = {},
): BuiltPrompt {
    const locale = options.locale ?? 'es';
    const system = `${BASE_SYSTEM}

You are re-judging a single marker that an initial pass labeled "${flashVerdict}". Confirm or correct that judgment with finer reasoning. If the initial pass overstated the issue (the excerpt does support the claim after all), return "supports". If it understated the issue, escalate (e.g. "partial" → "unrelated", "partial" → "contradicts").

The "reasoning" field must be written in ${localeName(locale)}. All other JSON keys and verdict labels remain in English exactly as specified.

${JSON_SHAPE_SONNET}`;

    const prompt = [
        `Marker [${claim.marker}]`,
        '',
        renderClaim(claim),
        '',
        `Initial Flash verdict: ${flashVerdict}`,
        `Initial Flash reasoning: ${flashReasoning}`,
    ].join('\n');

    return { system, prompt };
}

function renderClaim(c: FidelityClaimInput): string {
    const authorLine = c.sourceAuthor ? ` (${c.sourceAuthor})` : '';
    return [
        `[${c.marker}]`,
        `  Claim: ${c.claim}`,
        `  Cited source: ${c.sourceTitle}${authorLine}`,
        `  Excerpt: ${c.excerpt}`,
    ].join('\n');
}

function localeName(locale: 'es' | 'en'): string {
    return locale === 'es' ? 'Spanish' : 'English';
}
