import { IGreekTutorService, ISessionRepository, MorphologyBreakdown } from '@dosfilos/domain';

export class ExplainMorphologyUseCase {
    constructor(
        private greekTutorService: IGreekTutorService,
        private sessionRepository: ISessionRepository
    ) { }

    /**
     * Provides morphological breakdown for a Greek word in context.
     * Phase 3C: Now persists to Firestore to avoid regeneration.
     * 
     * @param word The Greek word to analyze
     * @param passage The Bible passage context
     * @param sessionId Session ID for persistence
     * @param unitId Unit ID for persistence
     * @param fileSearchStoreId Optional store for enhanced analysis
     * @param language Output language preference
     */
    async execute(
        word: string,
        passage: string,
        sessionId: string,
        unitId: string,
        fileSearchStoreId?: string,
        language?: string
    ): Promise<MorphologyBreakdown> {
        const morphology = await this.greekTutorService.explainMorphology(
            word,
            passage,
            fileSearchStoreId,
            language
        );

        // Phase 3C: Persist to Firestore to avoid regeneration
        try {
            await this.sessionRepository.updateUnitMorphology(sessionId, unitId, morphology);
        } catch (error) {
            console.error('[ExplainMorphologyUseCase] Failed to persist morphology:', error);
            // Don't fail the request if persistence fails
        }

        return morphology;
    }
}
