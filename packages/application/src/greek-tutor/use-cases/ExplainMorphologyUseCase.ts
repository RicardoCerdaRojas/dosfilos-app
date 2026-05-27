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

        // Defense-in-depth: the Gemini service now throws when the
        // model returns no components, but a stale cache or a future
        // adapter swap could still produce an empty payload. Guard
        // here too so the caller never receives an unusable
        // breakdown without an explicit error.
        if (!morphology || !Array.isArray(morphology.components) || morphology.components.length === 0) {
            console.warn('[ExplainMorphologyUseCase] morphology has no components', { word, passage, morphology });
            throw new Error(
                `No se obtuvo descomposición morfológica para "${word}". Reintenta o usa "Preguntas al Tutor" para pedir el análisis manualmente.`,
            );
        }

        // Persistence is best-effort: a cache miss next time means a
        // regen, which is fine. Surface the failure in logs (already
        // done) without breaking the request.
        try {
            await this.sessionRepository.updateUnitMorphology(sessionId, unitId, morphology);
        } catch (error) {
            console.error('[ExplainMorphologyUseCase] Failed to persist morphology:', error);
        }

        return morphology;
    }
}
