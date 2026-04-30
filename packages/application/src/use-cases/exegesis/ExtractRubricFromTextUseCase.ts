import type {
    ExtractRubricFromTextInput,
    ExtractRubricFromTextOutput,
    IExegeticalPaperRepository,
    IPaperRubricExtractor,
    PaperRubric,
} from '@dosfilos/domain';

/**
 * Pastes-text → extracts rubric → saves on the paper.
 *
 * The student types or pastes the seminary's rubric/assignment brief
 * into a textarea in the setup UI; this use case sends that text to
 * the configured `IPaperRubricExtractor` (Gemini-backed) and persists
 * the structured result on `paper.rubric`. The setup UI then surfaces
 * the extracted rubric in the editor — the student reviews, tweaks
 * any misreads, and saves.
 *
 * Why this is its own use case (not just `UpdateRubric`):
 *   - The extractor is an external service call; isolating it lets
 *     the UI render an "extracting" state distinct from "saving".
 *   - Confidence + review notes only make sense when extraction
 *     happened — they'd dirty the UpdateRubric API otherwise.
 *   - The extracted rubric goes through a clean "set" path
 *     (`setRubric`) rather than the partial-merge `updatePatch`
 *     path. New extraction = new rubric, full replacement.
 */
export class ExtractRubricFromTextUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private rubricExtractor: IPaperRubricExtractor,
    ) { }

    async execute(input: ExtractRubricFromTextInput): Promise<ExtractRubricFromTextOutput> {
        if (!input.ownerId) throw new Error('ExtractRubricFromTextUseCase: ownerId required');
        if (!input.paperId) throw new Error('ExtractRubricFromTextUseCase: paperId required');
        const trimmed = input.rawText.trim();
        if (trimmed.length < 30) {
            // 30 chars is a hard floor — anything less can't possibly
            // contain a meaningful rubric. Lets the UI guard against
            // accidental empty submissions early.
            throw new Error('ExtractRubricFromTextUseCase: rawText too short to extract a rubric');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const language = input.language ?? paper.displayLanguage;

        const extracted = await this.rubricExtractor.extract({
            rawText: trimmed,
            source: 'text',
            sourceCorpusId: null,
            language,
        });

        const now = new Date();
        const rubric: PaperRubric = {
            ...extracted.rubric,
            createdAt: paper.rubric?.createdAt ?? now,
            updatedAt: now,
        };

        const updated = await this.paperRepository.setRubric(input.ownerId, input.paperId, rubric);

        return {
            paper: updated,
            confidence: extracted.confidence,
            reviewNotes: extracted.reviewNotes,
        };
    }
}
