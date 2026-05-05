import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    StepSourcePlan,
    StepSourcePlanEntry,
} from '@dosfilos/domain';

export interface UpdateStepCorpusAllocationInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    /**
     * Replacement set of `ProjectSource.id`s pinned to this step.
     * Order matters — first id is "most relevant" for the
     * orchestrator's prompt construction.
     *
     * Pass `[]` to clear (the step falls through to type-level
     * emphasis at generation time).
     */
    pinnedSources: ReadonlyArray<string>;
    /**
     * Optional rationale text. Pass `undefined` to leave the existing
     * note untouched, `null` to explicitly clear it, or a string to
     * replace it.
     */
    note?: string | null;
}

/**
 * v1.7 — Manual single-step edit of `pinnedSources` (the chip
 * add/remove operation in the corpus-usage planning UI).
 *
 * Distinct from `UpdateStepPlanUseCase` (which only edits per-kind
 * defaults). This is finer-grained: one step at a time.
 *
 * Validation:
 *   - The step must exist on the paper.
 *   - Each pinned id must reference an existing source on the paper.
 *     Unknown ids are rejected with a precise error so the UI can
 *     surface them (rather than silently dropping).
 *
 * Does NOT touch `proposedAt` or `proposalCorpusSourceIds` — those
 * are owned by the planner use case. A manual edit doesn't reset
 * the staleness signal.
 */
export class UpdateStepCorpusAllocationUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: UpdateStepCorpusAllocationInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('UpdateStepCorpusAllocationUseCase: ownerId required');
        if (!input.paperId) throw new Error('UpdateStepCorpusAllocationUseCase: paperId required');
        if (!input.stepId) throw new Error('UpdateStepCorpusAllocationUseCase: stepId required');

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const step = paper.steps.find(s => s.id === input.stepId);
        if (!step) throw new Error(`Step ${input.stepId} not found on paper ${input.paperId}`);

        const validSourceIds = new Set(paper.sources.map(s => s.id));
        const unknownIds = input.pinnedSources.filter(id => !validSourceIds.has(id));
        if (unknownIds.length > 0) {
            throw new Error(`Unknown source ids in pinnedSources: ${unknownIds.join(', ')}`);
        }

        const existing = paper.stepPlan.perStep[input.stepId];
        const nextEntry: StepSourcePlanEntry = {
            stepId: input.stepId,
            kind: step.kind,
            emphasis: existing?.emphasis ?? {
                emphasizedTypes: [],
                deemphasizedTypes: [],
                citationOverrides: [],
            },
            pinnedSources: [...input.pinnedSources],
            suppressedSources: existing?.suppressedSources ?? [],
            note: input.note === undefined ? (existing?.note ?? null) : input.note,
        };

        const nextPlan: StepSourcePlan = {
            perStep: { ...paper.stepPlan.perStep, [input.stepId]: nextEntry },
            defaults: paper.stepPlan.defaults,
            updatedAt: new Date(),
            ...(paper.stepPlan.proposedAt !== undefined && { proposedAt: paper.stepPlan.proposedAt }),
            ...(paper.stepPlan.proposalCorpusSourceIds !== undefined && {
                proposalCorpusSourceIds: paper.stepPlan.proposalCorpusSourceIds,
            }),
        };

        return this.paperRepository.setStepPlan(input.ownerId, input.paperId, nextPlan);
    }
}
