import type { ExegeticalStepKind } from '../entities/ExegeticalStep';

/**
 * Cross-step coherence reviewer. Runs over the accepted markdown of
 * every step in a paper (introduction + verses + conclusion) and
 * surfaces inconsistencies the orchestrator's per-step prompts can't
 * catch — they only see one step at a time.
 *
 * Adversarial in spirit: the reviewer's job is to find problems, not
 * approve work. Empty issue list = the paper is internally
 * consistent. Non-empty list = the user has homework.
 */
export interface ICoherenceReviewer {
    review(input: CoherenceReviewInput): Promise<CoherenceReviewOutput>;
}

export interface CoherenceReviewInput {
    /**
     * Each accepted step in canonical paper order. Drop steps that
     * lack accepted content — the reviewer can't reason about
     * unfinished sections, and including them would invite
     * "introduction is missing" noise.
     */
    sections: ReadonlyArray<CoherenceReviewSection>;
    /** Paper-level passage label for context ("Hebreos 1:1-4"). */
    passageDisplay: string;
    /** Paper-level brief, when set. Shapes what coherence "looks like". */
    assignmentBrief: string | null;
    /** Output language. */
    language: 'es' | 'en';
}

export interface CoherenceReviewSection {
    stepId: string;
    kind: ExegeticalStepKind;
    /** Display label ("Versículo 3", "Conclusión", "Introducción"). */
    label: string;
    markdown: string;
}

export interface CoherenceReviewOutput {
    issues: ReadonlyArray<CoherenceIssue>;
    /**
     * One-sentence overall verdict in the user's language ("El paper
     * es internamente consistente." / "Se detectaron 4 inconsistencias…").
     */
    summary: string;
    tokensUsed: number | null;
    modelId: string;
}

export interface CoherenceIssue {
    category: CoherenceIssueCategory;
    severity: 'high' | 'medium' | 'low';
    /** Human-readable description in `input.language`. */
    message: string;
    /**
     * Step ids referenced by the issue. The UI uses these to scroll
     * the user to the relevant cards. Empty when the issue is
     * paper-wide (e.g. tone drift across the body).
     */
    relatedStepIds: ReadonlyArray<string>;
}

export type CoherenceIssueCategory =
    /** Introduction promises a thesis the conclusion doesn't deliver (or vice versa). */
    | 'thesis-mismatch'
    /** Two verses make incompatible claims (e.g. opposite translation choices). */
    | 'verse-conflict'
    /** Translation rendering shifts unaccountably across verses. */
    | 'translation-inconsistency'
    /** Introduction announces a discussion that the body never has. */
    | 'unfulfilled-promise'
    /** Conclusion adds new arguments instead of synthesizing. */
    | 'conclusion-overreach'
    /** Tone / register drifts (academic to devotional or back). */
    | 'tone-drift'
    /** Catch-all for things the reviewer flagged that don't fit above. */
    | 'other';
