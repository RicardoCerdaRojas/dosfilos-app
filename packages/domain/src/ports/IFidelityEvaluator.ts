import type { FidelityVerdict, SubstantiveClaim } from '../entities/FidelityReport';

/**
 * Pastoral Fidelity — Phase 3 PR 1 (ADR-029) port for the second-pass
 * evaluator that scores each `[N]` marker in a generated sermon. The
 * domain expresses the contract; the concrete adapter
 * (`CallableFidelityEvaluator` in `@dosfilos/application`) proxies to the
 * `evaluateClaimSourceFidelity` Cloud Function so the LLM keys stay
 * server-side.
 *
 * Why a port instead of a direct callable handle in the use case:
 *   - Decouples `RunFidelityPassUseCase` from Firebase, so tests can run
 *     the use case against an in-memory evaluator stub.
 *   - Lets us swap to a different orchestration (e.g. on-device model or
 *     a queued background job) without touching the use case.
 */

export interface FidelityEvaluationInput {
    /** Sermon document id. The server-side callable owns the read + auth check. */
    sermonId: string;
    /** Locale for the user-facing `reasoning` field on each verdict. Defaults to `es`. */
    locale?: 'es' | 'en';
}

export interface FidelityEvaluationResult {
    /** Stable id for the report — Firestore-friendly. */
    reportId: string;
    sermonId: string;
    generatedAt: Date;
    /** Which model tier(s) produced the verdicts. `mixed` when Sonnet escalated some Flash verdicts. */
    modelTier: 'flash' | 'sonnet' | 'mixed';
    verdicts: FidelityVerdict[];
    /**
     * Diagnostic — how many manifest entries had no extractable claim
     * (marker missing from prose, or no sentence before it). Surfaces in
     * the panel footer as "N markers without context" so the pastor knows
     * the report is not silently incomplete.
     */
    skippedMarkers: number;
    /**
     * Substantive doctrinal claims the tagger surfaced (ADR-029 §Q4), with
     * the distinct biblical passages each rests on. Consumed by
     * `computePluralityCheck` to build the plurality sub-report. Absent on
     * evaluators that don't run the tagger (older stubs) — treat as `[]`.
     */
    substantiveClaims?: SubstantiveClaim[];
}

export interface IFidelityEvaluator {
    evaluate(input: FidelityEvaluationInput): Promise<FidelityEvaluationResult>;
}
