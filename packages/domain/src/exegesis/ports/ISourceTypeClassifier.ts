import type { SourceType } from '../entities/SourceType';

/**
 * Port the corpus-attach UI uses to auto-detect a project source's
 * `SourceType` from a snippet of its content. Saves the user from
 * scrolling the 13-entry dropdown for every upload + reduces the
 * "wrong type defaulted" tail (which inflates rubric-gap warnings
 * and skews the orchestrator's per-step plan).
 *
 * Implementation lives in infrastructure (Gemini-backed). The
 * classifier receives a TEXT slice — the caller is responsible for
 * fetching the resource's `textContent` and slicing it (recommended
 * window: first ~5 000 characters, where the title page / preface /
 * opening pages establish what the source IS).
 *
 * Failures: throw — the UI falls back to the manual dropdown rather
 * than blocking the upload flow.
 */
export interface ISourceTypeClassifier {
    classify(input: ClassifySourceTypeInput): Promise<ClassifySourceTypeOutput>;
}

export interface ClassifySourceTypeInput {
    /** First ~5 000 characters of the resource's extracted text. */
    rawText: string;
    /** Resource title (display label) — strong signal for the model. */
    title?: string | null;
    /** Resource author — disambiguates between, say, a lexicon and a monograph. */
    author?: string | null;
    /**
     * Language for the optional `reasoning` string. Defaults to 'es'
     * when omitted so the UI doesn't have to special-case mixed-language
     * users.
     */
    language?: 'es' | 'en';
}

export interface ClassifySourceTypeOutput {
    /** Best-guess `SourceType` from the catalog. */
    sourceType: SourceType;
    /**
     * Classifier confidence. The UI surfaces the predicted type as a
     * pre-selection nudge with this confidence chip — high lets the
     * user accept blindly, low forces a glance at the dropdown.
     */
    confidence: 'high' | 'medium' | 'low';
    /**
     * Optional one-sentence rationale, localized to `input.language`.
     * Empty when the model didn't return one. Used by the UI to
     * explain the suggestion when confidence is medium / low.
     */
    reasoning: string;
    /** Token consumption for cost attribution. Null when unavailable. */
    tokensUsed: number | null;
    /** Model identifier — audit trail. */
    modelId: string;
}
