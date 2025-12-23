import { IQuizService, QuizQuestion, TrainingUnit } from '@dosfilos/domain';

/**
 * Use case for generating quiz questions for a training unit.
 * Follows Single Responsibility Principle - orchestrates quiz generation only.
 * 
 * Phase 3A: Supports hybrid generation (cache + Gemini)
 */
export class GenerateQuizUseCase {
    constructor(private quizService: IQuizService) { }

    /**
     * Generates quiz questions for a training unit.
     * Quiz service implementation handles caching strategy.
     * 
     * @param unit Training unit to generate quiz for
     * @param options Configuration options
     * @returns Array of quiz questions (2-3 questions)
     */
    async execute(
        unit: TrainingUnit,
        options: {
            count?: number;
            fileSearchStoreId?: string;
            language?: string;
        } = {}
    ): Promise<QuizQuestion[]> {
        const {
            count = 3, // Default: 3 questions per unit
            fileSearchStoreId,
            language = 'Spanish'
        } = options;

        // Delegate to quiz service (which handles hybrid cache/generation)
        const questions = await this.quizService.generateQuizQuestions(
            unit,
            count,
            fileSearchStoreId,
            language
        );

        return questions;
    }
}
