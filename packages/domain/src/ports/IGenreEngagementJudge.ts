/**
 * Redacción v2 Fase 1 (§4.4) — port of the genre-engagement judge.
 *
 * Sibling of `ICoverageEngagementJudge` (ADR-035 CA1): same shape, distinct
 * responsibility. The judge answers whether the pastor ENGAGED the discernment
 * of his pericope's genre — NOT whether he agrees with the system's proposal.
 * It emits the three booleans of `MisreadingJudgment`; the decision of what to
 * do with them is the pure `decideMisreadingTurn` (reused verbatim — a pastor
 * who worked the discernment and still holds a different genre is accepted via
 * the override floor, his choice registered, never blocked).
 *
 * The use case (`RunSocraticTurnUseCase`) calls THIS port, not the LLM directly
 * — testable with a fake judge in CI. The concrete implementation
 * (`CallableGenreEngagementJudge` in application, A3) calls a Sonnet callable,
 * sampled, in shadow first. The judge SOLO judges.
 */

import type { MisreadingJudgment } from '../services/misreadingTurn';

/**
 * The genre-engagement verdict. Structurally identical to `MisreadingJudgment`
 * so it flows straight into `decideMisreadingTurn`; aliased for readability at
 * call sites that reason about genre, not misreading.
 * - `substantive`: passed the minimum-substance gate (worked the discernment).
 * - `engagedAnchor`: engaged the proposed genre's reasoning, even if he differs.
 * - `contradictsAnchor`: his reading treats the pericope as a different genre
 *   than the one proposed (an override, not necessarily an error).
 */
export type GenreEngagementJudgment = MisreadingJudgment;

export interface GenreEngagementInput {
    /** What the pastor wrote in the turn. */
    pastorMessage: string;
    /** The genre the system inferred and proposed (the anchor). */
    proposedGenre: string;
    /** The visible rationale for the proposal (why the system reads it this way). */
    proposalRationale: string;
    /** Minimum-substance threshold of the step (GATE-MÍNIMO). */
    minSubstanceChars?: number;
}

export interface IGenreEngagementJudge {
    judge(input: GenreEngagementInput): Promise<GenreEngagementJudgment>;
}
