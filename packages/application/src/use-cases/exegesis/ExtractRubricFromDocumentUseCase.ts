import type {
    ExtractRubricFromDocumentInput,
    ExtractRubricFromDocumentOutput,
    IExegeticalPaperRepository,
    IPaperRubricExtractor,
    IResourceContentReader,
    PaperRubric,
} from '@dosfilos/domain';

/**
 * Document-backed counterpart to `ExtractRubricFromTextUseCase`.
 *
 * The UI uploads the rubric (PDF/image) via the regular library upload
 * flow, waits for `textExtractionStatus === 'ready'`, and then calls
 * this use case with the resulting `libraryResourceId`. The use case
 * fetches the extracted text via `IResourceContentReader`, hands it to
 * the same `IPaperRubricExtractor`, and persists the result on the
 * paper — same shape as the paste-text path.
 *
 * Why a separate use case instead of overloading the text one:
 *   - Provenance differs (`extracted-from-document` vs
 *     `extracted-from-text`); the extractor wants `source: 'document'`
 *     and `sourceCorpusId` set so the rubric remembers its origin.
 *   - The text path doesn't need the content reader injected — keeping
 *     them separate avoids forcing every caller to provide one.
 *
 * Failures: throws when the resource isn't owned, the text isn't
 * available yet (extraction pending), or the text is too short
 * (mirrors the 30-char floor in the text path so a thin scan doesn't
 * produce a hollow rubric).
 */
export class ExtractRubricFromDocumentUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private contentReader: IResourceContentReader,
        private rubricExtractor: IPaperRubricExtractor,
    ) { }

    async execute(input: ExtractRubricFromDocumentInput): Promise<ExtractRubricFromDocumentOutput> {
        if (!input.ownerId) throw new Error('ExtractRubricFromDocumentUseCase: ownerId required');
        if (!input.paperId) throw new Error('ExtractRubricFromDocumentUseCase: paperId required');
        if (!input.libraryResourceId) {
            throw new Error('ExtractRubricFromDocumentUseCase: libraryResourceId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const text = await this.contentReader.getTextContent(input.libraryResourceId);
        if (!text) {
            // No extracted text yet (resource still processing) OR
            // resource not found / not owned. The error stays the same
            // either way so the UI surfaces a single "extraction not
            // ready, retry" message.
            throw new Error(
                `Library resource ${input.libraryResourceId} has no extracted text available yet`,
            );
        }
        const trimmed = text.trim();
        if (trimmed.length < 30) {
            throw new Error(
                'ExtractRubricFromDocumentUseCase: extracted text too short to extract a rubric',
            );
        }

        const language = input.language ?? paper.displayLanguage;

        const extracted = await this.rubricExtractor.extract({
            rawText: trimmed,
            source: 'document',
            sourceCorpusId: input.libraryResourceId,
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
