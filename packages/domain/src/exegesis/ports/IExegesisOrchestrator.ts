import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ExegeticalStepKind } from '../entities/ExegeticalStep';
import type { SourceType } from '../entities/SourceType';

/**
 * Port for the LLM-driven generation step.
 *
 * Implementations live in infrastructure (Gemini, OpenAI, etc.). The use
 * case in `application/` resolves all the context (style guide text,
 * source extracts, accepted prior steps) and hands it to the orchestrator
 * pre-assembled — the orchestrator itself stays dumb and only handles
 * "given this context, produce markdown for this step kind".
 *
 * The 'assembly' kind is intentionally NOT served here — the use case
 * concatenates accepted markdown directly, no LLM call needed.
 */
export interface IExegesisOrchestrator {
    generateStep(input: ExegesisGenerationInput): Promise<ExegesisGenerationOutput>;
}

export interface ExegesisGenerationInput {
    /** Always one of the LLM-driven kinds: 'verse' | 'conclusion' | 'introduction'. */
    kind: Exclude<ExegeticalStepKind, 'assembly'>;
    /** The whole-paper passage range (for context — even verse steps reference the surrounding scope). */
    paperPassage: PassageReference;
    /** For verse steps, the specific verse this generation covers. Null for conclusion/introduction. */
    verseRef: PassageReference | null;
    /** Output language (drives prompt + defense-in-depth language directive). */
    language: 'es' | 'en';
    /**
     * Style guide content (TMS or equivalent) verbatim. Injected into the
     * system prompt as authoritative formatting rules. Empty string is
     * tolerated — the use case decides whether to surface "no guide" as
     * an error before reaching here.
     */
    styleGuideContent: string;
    /**
     * Project sources, each with role + extracted text content. The
     * orchestrator weights/filters per role (primary-commentary first
     * for verses, lexicon for term meanings, etc.). 'model-paper' role
     * is consumed for STYLE imitation only — the prompt explicitly
     * instructs the model not to cite from it.
     */
    sources: ExegesisSourceContext[];
    /**
     * Accepted prior-step markdown, only relevant for 'conclusion' and
     * 'introduction'. For 'verse' kind this is empty.
     *   - conclusion sees: all accepted verses
     *   - introduction sees: all accepted verses + accepted conclusion
     */
    priorAcceptedSteps: ExegesisPriorStep[];
    /** Optional regeneration hint provided by the user. */
    regenerationHint: string | null;
}

export interface ExegesisSourceContext {
    /** library_resources doc id — for traceability + future verifier. */
    corpusId: string;
    sourceType: SourceType;
    /** Display label shown to the user, e.g. "Lane WBC 47a, pp. 1-30". */
    displayLabel: string;
    /** Author key for inline citations, e.g. "Lane". May be null. */
    citationKey: string | null;
    /** Extracted text. Truncated upstream if it would blow the context window. */
    textContent: string;
}

export interface ExegesisPriorStep {
    kind: ExegeticalStepKind;
    /** For 'verse' steps, the verse reference; otherwise null. */
    verseRef: PassageReference | null;
    /** The accepted markdown of the prior step. */
    markdown: string;
}

export interface ExegesisGenerationOutput {
    markdown: string;
    /** Identifier of the model that produced this. Stored on the version for audit. */
    modelId: string;
    /** Total tokens consumed (prompt + completion). Null if the model didn't report. */
    tokensUsed: number | null;
}
