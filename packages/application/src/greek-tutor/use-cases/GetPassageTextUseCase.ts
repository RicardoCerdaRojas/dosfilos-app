import { IGreekTutorService, ISessionRepository, BiblicalPassage } from '@dosfilos/domain';

/**
 * Use case: Get biblical passage in multiple versions
 * 
 * Phase 3D: Implements global cache-first strategy to minimize costs.
 * Orchestrates retrieval of passage text in RV60, Greek, and transliteration
 * for interactive reading and word selection.
 */
export class GetPassageTextUseCase {
    constructor(
        private greekTutorService: IGreekTutorService,
        private sessionRepository: ISessionRepository
    ) { }

    /**
     * Executes the use case with cache-first strategy
     * @param reference Bible reference (e.g., "Romanos 12:1-2")
     * @param fileSearchStoreId Optional Exegesis Library store ID
     * @param language Output language (default: Spanish)
     * @returns BiblicalPassage with all versions and tokenized words
     */
    async execute(
        reference: string,
        fileSearchStoreId?: string,
        language: string = 'Spanish'
    ): Promise<BiblicalPassage> {
        console.log('[GetPassageTextUseCase] Fetching passage:', reference);

        // Phase 3D: Check cache first (global across users)
        const cached = await this.sessionRepository.getCachedPassage(reference);
        if (cached) {
            console.log('[GetPassageTextUseCase] Using cached passage');
            return cached;
        }

        // Not cached - generate with Gemini
        console.log('[GetPassageTextUseCase] Generating passage with Gemini');
        try {
            const passage = await this.greekTutorService.getPassageText(
                reference,
                fileSearchStoreId,
                language
            );

            // Phase 3D: Cache for future use
            await this.sessionRepository.cachePassage(passage);
            console.log('[GetPassageTextUseCase] Successfully cached passage for reuse');

            return passage;
        } catch (error) {
            console.error('[GetPassageTextUseCase] Error fetching passage:', error);
            throw new Error(`Failed to fetch passage ${reference}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
