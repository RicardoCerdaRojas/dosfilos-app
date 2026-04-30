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
 * `styleGuideId` is allowed to be null in v1 — the orchestrator will
 * reject generation until a guide is attached, but a paper can exist
 * without one.
 *
 * `assignmentBrief` is optional free text the professor or the student
 * provided to frame the paper. Stored verbatim; the orchestrator
 * threads it into every step's system prompt.
 *
 * `initialSources` is accepted but currently ignored — sources are
 * collected later through the dedicated setup flow.
 */

/**
 * Normalizes a brief: trims whitespace, returns null for empty
 * strings. Keeps Firestore docs consistent (null vs. empty string is
 * a needless distinction the rest of the system would have to
 * handle).
 */
function normalizeBrief(brief: string | null | undefined): string | null {
    if (brief === undefined || brief === null) return null;
    const trimmed = brief.trim();
    return trimmed.length === 0 ? null : trimmed;
}
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
            assignmentBrief: normalizeBrief(input.assignmentBrief),
            styleGuideId: input.styleGuideId,
            sources: [],
        });
    }
}
