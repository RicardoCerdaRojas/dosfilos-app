import type {
    ExtractRubricFromImageInput,
    ExtractRubricFromImageOutput,
    IExegeticalPaperRepository,
    IPaperRubricExtractor,
    PaperRubric,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

/**
 * Pasted-or-uploaded image → extracts rubric via Gemini Vision →
 * saves on the paper.
 *
 * Bypasses the library upload pipeline used by
 * `ExtractRubricFromDocumentUseCase` (PDF/EPUB → LlamaParse text →
 * extractor). Image extraction happens in a single multimodal call:
 * the image bytes go inline alongside the JSON-extraction prompt, and
 * Gemini Vision parses the rubric directly from the picture.
 *
 * Why a separate use case:
 *   - Image rubrics shouldn't pollute the user's library — the
 *     screenshot of a syllabus isn't a "resource" they want to find
 *     later in their personal corpus.
 *   - Skipping the LibraryResource roundtrip cuts the latency from
 *     ~30-90s (LlamaParse extraction wait) to ~5-10s (one Gemini
 *     Vision call).
 *   - The hardcoded `mimeType: 'application/pdf'` in the cloud
 *     extraction function rejects images outright; this path avoids
 *     it entirely.
 *
 * Provenance is set to `extracted-from-document` (same enum value
 * the PDF path uses) — the image is conceptually the rubric document,
 * just rendered as pixels instead of vector text.
 */
export class ExtractRubricFromImageUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private rubricExtractor: IPaperRubricExtractor,
    ) { }

    async execute(input: ExtractRubricFromImageInput): Promise<ExtractRubricFromImageOutput> {
        if (!input.ownerId) throw new Error('ExtractRubricFromImageUseCase: ownerId required');
        if (!input.paperId) throw new Error('ExtractRubricFromImageUseCase: paperId required');
        if (!input.mimeType.startsWith('image/')) {
            throw new Error(`ExtractRubricFromImageUseCase: mimeType must be image/*, got ${input.mimeType}`);
        }
        if (!input.imageBase64 || input.imageBase64.length === 0) {
            throw new Error('ExtractRubricFromImageUseCase: imageBase64 required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const language = input.language ?? paper.displayLanguage;

        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'extractRubricFromImage',
        );

        try {
            reservation.markLlmContacted();
            const extracted = await this.rubricExtractor.extract({
                rawText: '',
                inlineImage: {
                    mimeType: input.mimeType,
                    base64: input.imageBase64,
                },
                source: 'image',
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
        } catch (err) {
            await reservation.refundIfPreLlm();
            throw err;
        }
    }
}
