/**
 * Output of Pase 5 (evaluación de fidelidad) of the expository assistant.
 *
 * The reviewer takes the panorama + macro + micro + preachable
 * outputs of the prior passes and audits them against the
 * methodology's anti-patterns: separating exhortations from their
 * grounds, breaking parallelisms that should stay together, splitting
 * a narrative climax across two sermons, mixing distinct prophetic
 * oracles into a single unit, etc.
 *
 * The review is ADVISORY, not destructive. It surfaces issues the
 * pastor should consider; it does NOT silently rewrite the prior
 * passes' output. The wizard renders the issues as warnings, and
 * lets the pastor accept them, ignore them, or apply the suggested
 * adjustments manually.
 */
export interface FidelityReview {
    /**
     * Confidence the reviewer has that the preachable units faithfully
     * represent the author's intent. 0..1. Below ~0.7, the wizard
     * downgrades the issues from "suggestions" to "warnings".
     */
    overallConfidence: number;
    /** Issues found across all preachable units, plus any global concerns. */
    issues: FidelityIssue[];
}

export interface FidelityIssue {
    /**
     * The PreachableUnit id this issue is anchored on. Null when the
     * issue spans the whole run (e.g. "the series ignores the book's
     * doxology entirely").
     */
    unitId: string | null;
    /** Severity of the concern. */
    severity: 'info' | 'warning' | 'critical';
    /** What the reviewer flagged. 1-3 sentences. */
    description: string;
    /**
     * Concrete suggestion, when the reviewer can offer one ("considera
     * mover los versos 9-10 al sermón siguiente para no cortar el
     * paralelismo"). Optional — some issues are just signals.
     */
    recommendation?: string;
}
