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
 * Today the data lives on `paper.rubric.structuralExpectations`.
 * Conceptually it belongs to the corpus strategy (the method the
 * student uses to build the corpus, not the seminary's grading
 * criteria). The decoupling refactor (memory entry
 * `feature_exegesis_strategy_rubric_separation`) plans to move it
 * to a richer `ExegeticalStrategy` entity in a future pass.
 *
 * Routing every paper-level read through this helper means that
 * future move is a SINGLE-FILE change — internals of the helper —
 * and downstream consumers stay stable.
 *
 * Resolution order:
 *   1. `paper.rubric.structuralExpectations` when present and non-
 *      empty (today's authoritative source).
 *   2. `DEFAULT_TMS_EXEGETICAL_RUBRIC.structuralExpectations` as
 *      the system fallback (covers papers without a rubric, plus
 *      papers whose rubric was extracted without per-section
 *      emphasis filled in).
 */
export function getEffectiveStructuralExpectations(
    paper: ExegeticalPaper,
): ReadonlyArray<StructuralExpectation> {
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
