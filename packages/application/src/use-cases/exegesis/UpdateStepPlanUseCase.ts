import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    StepEmphasis,
    StepSourcePlan,
    UpdateStepPlanInput,
} from '@dosfilos/domain';
import { getEffectiveSectionStructuralExpectation } from '@dosfilos/domain';

/**
 * Patches the per-kind defaults of `paper.stepPlan`.
 *
 * v1 only edits the kind-level defaults (introduction / verse /
 * conclusion). Per-step overrides keyed by `stepId` stay untouched —
 * they're a v1.5 surface that lets the student tune emphasis for a
 * specific verse rather than for verses in general.
 *
 * Idempotent: re-saving the same emphasis produces the same plan.
 * The use case ensures `updatedAt` advances on each save so the UI
 * has a clear "last saved" timestamp to surface.
 */
export class UpdateStepPlanUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: UpdateStepPlanInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('UpdateStepPlanUseCase: ownerId required');
        if (!input.paperId) throw new Error('UpdateStepPlanUseCase: paperId required');

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        // Build the next plan by merging existing perStep entries +
        // existing defaults + the patched kinds. Patched kinds replace
        // the prior emphasis wholesale (lists are small enough that
        // partial diffs would be more complexity than it's worth).
        const nextDefaults = {
            verse: input.verse ?? paper.stepPlan.defaults.verse,
            conclusion: input.conclusion ?? paper.stepPlan.defaults.conclusion,
            introduction: input.introduction ?? paper.stepPlan.defaults.introduction,
        };

        const nextPlan: StepSourcePlan = {
            perStep: paper.stepPlan.perStep,
            defaults: nextDefaults,
            updatedAt: new Date(),
        };

        return this.paperRepository.setStepPlan(input.ownerId, input.paperId, nextPlan);
    }

    /**
     * Convenience: returns the structural-expectation defaults so
     * callers (e.g. the "reset to rubric default" button) can rebuild
     * the suggestion without re-implementing the mapping.
     *
     * Routes through the domain helper so the planned strategy↔rubric
     * data move (memory entry
     * `feature_exegesis_strategy_rubric_separation`) is a single-file
     * change. Today the helper resolves to
     * `paper.rubric.structuralExpectations` (or the system default
     * when absent).
     */
    static rubricDefaultEmphasis(
        paper: ExegeticalPaper,
        kind: 'introduction' | 'verse' | 'conclusion',
    ): StepEmphasis {
        const expectation = getEffectiveSectionStructuralExpectation(paper, kind);
        return {
            emphasizedTypes: expectation?.emphasizedTypes ?? [],
            deemphasizedTypes: [],
            citationOverrides: [],
        };
    }
}
