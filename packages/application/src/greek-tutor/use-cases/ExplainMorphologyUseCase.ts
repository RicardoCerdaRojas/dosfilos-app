import { IGreekTutorService, MorphologyBreakdown } from '@dosfilos/domain';

export class ExplainMorphologyUseCase {
    constructor(private greekTutorService: IGreekTutorService) { }

    /**
     * Provides morphological breakdown for a Greek word in context.
     * @param word The Greek word to analyze
     * @param passage The Bible passage context
     * @param fileSearchStoreId Optional store for enhanced analysis
     * @param language Output language preference
     */
    async execute(
        word: string,
        passage: string,
        fileSearchStoreId?: string,
        language?: string
    ): Promise<MorphologyBreakdown> {
        return await this.greekTutorService.explainMorphology(word, passage, fileSearchStoreId, language);
    }
}
