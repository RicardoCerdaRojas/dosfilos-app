import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ExegeticalStepKind } from '../entities/ExegeticalStep';
import type { SourceType } from '../entities/SourceType';
import type { StepEmphasis } from '../entities/StepSourcePlan';

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
     * Free-text framing of the paper — typically the assignment brief
     * the professor gave plus the angle the student wants to take.
     * Injected verbatim near the top of the system prompt so the LLM
     * keeps every step (intro, verses, conclusion) aligned with the
     * same paper-level identity. Null when the student didn't supply
     * one — the prompt falls back to neutral framing.
     */
    assignmentBrief: string | null;
    /**
     * Per-step emphasis the student saved (or accepted from the
     * rubric default) — drives source-budget weights and a "priority
     * directive" block in the user message. Null means "use the
     * type catalog's static weights alone" (the orchestrator still
     * works, it just doesn't bias toward the student's plan).
     */
    stepEmphasis: StepEmphasis | null;
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
    /**
     * Source body the orchestrator inlines into the prompt. For
     * `'full-document'` sources this is the entire textContent. For
     * `'extracted-excerpts'` sources, the use case pre-concatenates
     * the curated chunks with `--- ${sourceLocation} ---` separators
     * — same string slot, different upstream provenance. The
     * orchestrator doesn't branch on the difference; it just
     * inlines the text and trusts the caller's curation.
     */
    textContent: string;
    /**
     * Set when the source is in `'extracted-excerpts'` mode. Lists
     * the per-excerpt anchors (`"p. 47, § 3.2"`) so the prompt
     * template can ask Gemini to cite using these stable labels —
     * crucial for the v1.5 visibility promise (the user reviewed
     * specific excerpts; the model cites those, not the full doc).
     * Undefined for full-document sources, which cite by author +
     * label as before.
     */
    excerptAnchors?: ReadonlyArray<string>;
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
