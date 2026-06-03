import {
    FIDELITY_REPORT_VERSION,
    computeAttributionCheck,
    computeFidelitySummary,
    computePluralityCheck,
    type FidelityReport,
    type IFidelityEvaluator,
    type ISermonRepository,
} from '@dosfilos/domain';

/**
 * Pastoral Fidelity — Phase 3 PR 1 (ADR-029) use case.
 *
 * Orchestrates the second-pass claim ↔ source evaluator:
 *   1. Delegates the LLM batch + escalation to an `IFidelityEvaluator`
 *      adapter (the web app wires `CallableFidelityEvaluator`, server-side
 *      callable; tests pass a stub).
 *   2. Computes the `summary` + `gateStatus` via the pure domain policy
 *      (`computeFidelitySummary`). Thresholds + cache invalidation rules
 *      live there, not here.
 *   3. Persists the report via `ISermonRepository.updateFidelityReport`
 *      so the sermon doc carries the latest pass and the
 *      `FidelityReviewPanel` can render it on next load.
 *   4. Returns the composed `FidelityReport` so the caller can update
 *      local state without a roundtrip.
 *
 * Pure orchestration — no Firebase, no LLM SDK imports. Strict-TDD
 * friendly (the application package has matching unit tests under
 * `use-cases/sermon/__tests__/`).
 */
export class RunFidelityPassUseCase {
    constructor(
        private readonly evaluator: IFidelityEvaluator,
        private readonly sermonRepository: ISermonRepository,
    ) {}

    async execute(input: { sermonId: string; locale?: 'es' | 'en' }): Promise<FidelityReport> {
        const evaluation = await this.evaluator.evaluate({
            sermonId: input.sermonId,
            locale: input.locale,
        });

        // Plurality (PR 3, Q4) — the no-proof-texting check. Feeds the gate
        // as a soft-block when any substantive core/distinctive claim leans on
        // a single biblical passage.
        const pluralityReport = computePluralityCheck(evaluation.substantiveClaims ?? []);

        // Authority (PR 4) — confession-as-final-authority check. Any violation
        // feeds the gate as a soft-block (overridable, like plurality).
        const authorityViolations = evaluation.authorityViolations ?? [];
        const authorityReport = { authorityViolations };

        // Attribution (PR 5, ADR-006 / Q7) — pure, manifest-derived. Computed
        // from the sermon's own citation manifest, NOT the LLM pass, so it
        // stays correct even when the evaluator returns no verdicts. Does NOT
        // feed the gate (legal compliance renders on every export regardless of
        // the fidelity flag); surfaced in the panel as a pre-publish flag.
        const sermon = await this.sermonRepository.findById(input.sermonId);
        const attributionReport = computeAttributionCheck(sermon?.citationManifest);

        const { summary, gateStatus } = computeFidelitySummary({
            verdicts: evaluation.verdicts,
            pluralityHasFailures: pluralityReport.failures.length > 0,
            authorityHasViolations: authorityViolations.length > 0,
        });

        const report: FidelityReport = {
            version: FIDELITY_REPORT_VERSION,
            reportId: evaluation.reportId,
            sermonId: evaluation.sermonId,
            generatedAt: evaluation.generatedAt,
            modelTier: evaluation.modelTier,
            verdicts: evaluation.verdicts,
            summary,
            gateStatus,
            pluralityReport,
            authorityReport,
            attributionReport,
        };

        await this.sermonRepository.updateFidelityReport(input.sermonId, report);
        return report;
    }
}
