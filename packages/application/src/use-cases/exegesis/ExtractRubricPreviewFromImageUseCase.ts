import type {
    ExtractRubricPreviewFromImageInput,
    ExtractRubricPreviewFromImageOutput,
    IExegeticalPaperRepository,
    IPaperRubricExtractor,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

/**
 * Sibling of `ExtractRubricFromImageUseCase` that returns the
 * extracted rubric to the CALLER without persisting it on the paper.
 *
 * Used by the qualitative-criteria editor: the student already has a
 * prescriptive rubric configured (source requirements, expected length,
 * structural recommendations) and only wants to PATCH the qualitative
 * section by extracting criteria from a fresh image. The persistent
 * "Foto/PDF" chooser flow is a wholesale replace and would clobber
 * the prescriptive section the student already curated.
 *
 * The client cherry-picks `result.rubric.qualityCriteria` from the
 * response, merges into local editor state (dedup by name), and the
 * existing UpdateRubric flow persists the merged rubric on Save.
 *
 * Credit cost is the same as `ExtractRubricFromImage` — both make
 * one Gemini Vision multimodal call. Reservation enforces this even
 * though no persistence happens here.
 */
export class ExtractRubricPreviewFromImageUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private rubricExtractor: IPaperRubricExtractor,
    ) { }

    async execute(input: ExtractRubricPreviewFromImageInput): Promise<ExtractRubricPreviewFromImageOutput> {
        if (!input.ownerId) throw new Error('ExtractRubricPreviewFromImageUseCase: ownerId required');
        if (!input.paperId) throw new Error('ExtractRubricPreviewFromImageUseCase: paperId required');
        if (!input.mimeType.startsWith('image/')) {
            throw new Error(`ExtractRubricPreviewFromImageUseCase: mimeType must be image/*, got ${input.mimeType}`);
        }
        if (!input.imageBase64 || input.imageBase64.length === 0) {
            throw new Error('ExtractRubricPreviewFromImageUseCase: imageBase64 required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const language = input.language ?? paper.displayLanguage;

        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'extractRubricPreviewFromImage',
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

            // Stamp timestamps so the returned PaperRubric shape is
            // complete. Caller (the UI) only consumes `qualityCriteria`
            // — the timestamps are throwaway because nothing persists
            // here, but the domain type requires them.
            const now = new Date();
            return {
                rubric: { ...extracted.rubric, createdAt: now, updatedAt: now },
                confidence: extracted.confidence,
                reviewNotes: extracted.reviewNotes,
            };
        } catch (err) {
            await reservation.refundIfPreLlm();
            throw err;
        }
    }
}
