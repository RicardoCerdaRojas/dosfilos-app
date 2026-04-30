import type {
    AddProjectSourceInput,
    IExegeticalPaperRepository,
    ProjectSource,
} from '@dosfilos/domain';

/**
 * Attaches an already-uploaded library_resource to a paper as a project
 * source, with role tagging. The actual file upload (Firebase Storage +
 * LlamaParse extraction trigger) happens upstream via
 * `libraryService.uploadResource(...)` — same pattern as user style guides.
 *
 * `order` is auto-assigned to the next available index (current count of
 * sources on the paper). Callers can update it later with
 * `UpdateProjectSourceUseCase` if they want to reorder.
 */
export class AddProjectSourceUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: AddProjectSourceInput & {
        ownerId: string;
        paperId: string;
    }): Promise<ProjectSource> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('AddProjectSourceUseCase: ownerId and paperId required');
        }
        if (!input.corpusId) {
            throw new Error('AddProjectSourceUseCase: corpusId required');
        }
        if (!input.sourceType) {
            throw new Error('AddProjectSourceUseCase: sourceType required');
        }

        // Auto-assign order from the paper's current source count. Reading
        // the paper here adds a round-trip but keeps the use case correct
        // without requiring callers to compute order themselves. The
        // repo's transactional addSource ignores `order` collisions —
        // duplicates would only happen under concurrent calls from the
        // same user across tabs.
        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) {
            throw new Error(`Paper ${input.paperId} not found`);
        }
        const order = paper.sources.length;

        return this.paperRepository.addSource(input.ownerId, input.paperId, {
            corpusId: input.corpusId,
            sourceType: input.sourceType,
            displayLabel: input.displayLabel,
            citationKey: input.citationKey ?? null,
            order,
        });
    }
}
