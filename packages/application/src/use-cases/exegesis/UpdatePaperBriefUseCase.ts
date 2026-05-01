import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    UpdatePaperBriefInput,
} from '@dosfilos/domain';

/**
 * Updates the paper's `assignmentBrief` text.
 *
 * Tiny use case so the setup page (and any future "edit framing"
 * surface) doesn't have to reach into the broader `updatePaper`
 * patch shape — the brief is the only field the framing form
 * touches.
 *
 * Trims whitespace and converts empty input to null so persisted
 * docs stay consistent. The orchestrator skips the brief block in
 * the system prompt when this is null, so clearing it is the right
 * way for a student to say "no framing context — fall back to
 * neutral".
 */
export class UpdatePaperBriefUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: UpdatePaperBriefInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('UpdatePaperBriefUseCase: ownerId required');
        if (!input.paperId) throw new Error('UpdatePaperBriefUseCase: paperId required');

        const normalized =
            input.assignmentBrief === null || input.assignmentBrief === undefined
                ? null
                : input.assignmentBrief.trim().length === 0
                    ? null
                    : input.assignmentBrief.trim();

        return this.paperRepository.updatePaper(input.ownerId, input.paperId, {
            assignmentBrief: normalized,
        });
    }
}
