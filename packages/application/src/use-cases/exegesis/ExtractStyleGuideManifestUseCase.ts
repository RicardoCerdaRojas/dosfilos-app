import type {
    ExtractStyleGuideManifestInput,
    ExtractStyleGuideManifestOutput,
    IResourceContentReader,
    IStyleGuideManifestExtractor,
    IUserStyleGuideRepository,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';

/**
 * Reads a `UserStyleGuide`'s corpus text → calls the
 * `IStyleGuideManifestExtractor` (Gemini-backed) → persists the
 * result on the guide.
 *
 * Triggered from the manifest sub-step of the setup UI: once the
 * student has uploaded a style guide and LlamaParse has extracted
 * the text, this use case turns that text into structured rules
 * the orchestrator + post-processor can enforce deterministically.
 *
 * Dependencies:
 *   - styleGuideRepository: read the guide pointer + write back the
 *     manifest.
 *   - contentReader: fetch the extracted text by corpusId. Same
 *     adapter the GenerateStepUseCase uses.
 *   - manifestExtractor: the LLM call. The use case stays free of
 *     prompt details by going through the port.
 */
export class ExtractStyleGuideManifestUseCase {
    constructor(
        private styleGuideRepository: IUserStyleGuideRepository,
        private contentReader: IResourceContentReader,
        private manifestExtractor: IStyleGuideManifestExtractor,
    ) { }

    async execute(input: ExtractStyleGuideManifestInput): Promise<ExtractStyleGuideManifestOutput> {
        if (!input.ownerId) throw new Error('ExtractStyleGuideManifestUseCase: ownerId required');
        if (!input.guideId) throw new Error('ExtractStyleGuideManifestUseCase: guideId required');

        const guide = await this.styleGuideRepository.getGuide(input.ownerId, input.guideId);
        if (!guide) throw new Error(`Guide ${input.guideId} not found`);

        const rawText = await this.contentReader.getTextContent(guide.corpusId);
        if (!rawText || rawText.trim().length < 50) {
            throw new Error(
                `Style guide corpus ${guide.corpusId} has no extracted text yet. `
                + `LlamaParse likely hasn't finished processing — try again in a moment.`,
            );
        }

        const language = input.language ?? 'es';

        const reservation = await ExegesisCreditReservation.open(
            input.ownerId,
            'extractStyleGuideManifest',
        );

        try {
            reservation.markLlmContacted();
            const result = await this.manifestExtractor.extract({
                rawText,
                language,
            });

            const updated = await this.styleGuideRepository.setManifest(
                input.ownerId,
                input.guideId,
                result.manifest,
            );

            return {
                guide: updated,
                tokensUsed: result.tokensUsed,
            };
        } catch (err) {
            await reservation.refundIfPreLlm();
            throw err;
        }
    }
}
