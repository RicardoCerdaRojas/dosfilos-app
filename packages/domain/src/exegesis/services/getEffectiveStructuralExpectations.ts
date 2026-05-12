import type { ExegeticalPaper } from '../entities/ExegeticalPaper';
import type { ExegeticalStepKind } from '../entities/ExegeticalStep';
import {
    DEFAULT_TMS_EXEGETICAL_RUBRIC,
    type StructuralExpectation,
} from '../entities/PaperRubric';

/**
 * Single source of truth for resolving the structural expectations
 * that a paper should follow (per-section emphasis: which source
 * types lead the introduction, the verse body, the conclusion).
 *
 * Conceptually the data belongs to the corpus strategy (the method
 * the student uses to build the corpus, not the seminary's grading
 * criteria). The Phase 2B decoupling moved it from PaperRubric to
 * ExegeticalPaper.structuralExpectations as a top-level field —
 * still kept dual-written to the rubric for back-compat with
 * documents persisted before the move.
 *
 * Routing every paper-level read through this helper means the move
 * is a one-line change inside the helper and downstream consumers
 * stay stable.
 *
 * Resolution order:
 *   1. `paper.structuralExpectations` when present and non-empty
 *      (canonical post-Phase-2B source).
 *   2. `paper.rubric.structuralExpectations` when present and non-
 *      empty (back-compat for legacy papers persisted before the
 *      paper-level field existed).
 *   3. `DEFAULT_TMS_EXEGETICAL_RUBRIC.structuralExpectations` as
 *      the system fallback (covers papers without a rubric, plus
 *      papers whose rubric was extracted without per-section
 *      emphasis filled in).
 */
export function getEffectiveStructuralExpectations(
    paper: ExegeticalPaper,
): ReadonlyArray<StructuralExpectation> {
    const fromPaper = paper.structuralExpectations ?? [];
    if (fromPaper.length > 0) return fromPaper;
    const fromRubric = paper.rubric?.structuralExpectations ?? [];
    if (fromRubric.length > 0) return fromRubric;
    return DEFAULT_TMS_EXEGETICAL_RUBRIC.structuralExpectations;
}

/**
 * Convenience accessor for the structural expectation of a single
 * step kind (introduction / verse / conclusion). The assembly step
 * has no structural expectation; the helper returns `null` for it.
 */
export function getEffectiveSectionStructuralExpectation(
    paper: ExegeticalPaper,
    kind: ExegeticalStepKind,
): StructuralExpectation | null {
    if (kind === 'assembly') return null;
    const all = getEffectiveStructuralExpectations(paper);
    return all.find(e => e.section === kind) ?? null;
}
