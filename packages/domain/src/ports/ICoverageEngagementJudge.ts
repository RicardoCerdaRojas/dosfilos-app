/**
 * ADR-035 CA1 — puerto del juez de engagement (D commit 2).
 *
 * El use case (`RunSocraticTurnUseCase`) llama a ESTE puerto, no al LLM directo
 * — testeable con un juez fake en CI (sin LLM ni enforce-on). La implementación
 * concreta (`CallableCoverageEngagementJudge` en application) llama al callable
 * `evaluateCoverageEngagement` (tier Sonnet, CA1). El juez SOLO juzga; la
 * decisión vive en `decideMisreadingTurn`.
 */

import type { MisreadingJudgment } from '../services/misreadingTurn';

export interface CoverageEngagementInput {
    /** Lo que el pastor escribió en el turno. */
    pastorMessage: string;
    /** La lectura errónea señalada por el perfil. */
    claim: string;
    /** Por qué es errónea (del perfil). */
    whyWrong: string;
    /** Anclas correctivas verificables (referencias) del perfil. */
    correctiveAnchors: string[];
    /** Umbral de sustancia del paso (GATE-MÍNIMO). */
    minSubstanceChars?: number;
}

export interface ICoverageEngagementJudge {
    judge(input: CoverageEngagementInput): Promise<MisreadingJudgment>;
}
