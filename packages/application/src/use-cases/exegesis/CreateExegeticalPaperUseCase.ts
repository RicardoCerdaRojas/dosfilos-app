import type {
    CreateExegeticalPaperInput,
    ExegeticalPaper,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Creates a new exegetical paper in 'configuring' phase.
 *
 * The use case trusts the caller to have validated the passage with
 * `parsePassageReference` or `buildPassageReference` first — it does NOT
 * re-parse. This keeps the boundary clean: parsing is presentation logic
 * (the UI tries multiple inputs); persistence is the use-case concern.
 *
 * `styleGuideId` is allowed to be null in v1 — the wizard's style-guide
 * step is a v1.5 placeholder. The orchestrator will reject generation
 * until a guide is attached, but a paper can exist without one.
 *
 * `initialSources` is accepted but currently ignored — the wizard's source
 * step is also a v1.5 placeholder. Wired through later by the
 * `AddProjectSource` use case.
 */
export class CreateExegeticalPaperUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: CreateExegeticalPaperInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) {
            throw new Error('CreateExegeticalPaperUseCase: ownerId required');
        }
        if (!input.passage) {
            throw new Error('CreateExegeticalPaperUseCase: passage required');
        }

        return this.paperRepository.createPaper({
            ownerId: input.ownerId,
            passage: input.passage,
            displayLanguage: input.displayLanguage,
            title: input.title,
            styleGuideId: input.styleGuideId,
            sources: [],
        });
    }
}
