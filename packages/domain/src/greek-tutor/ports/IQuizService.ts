import { QuizQuestion, TrainingUnit } from '../entities/entities';

/**
 * Port for quiz generation service.
 * Follows Dependency Inversion Principle - domain defines interface, infrastructure implements.
 * 
 * Phase 3A: Supports hybrid quiz generation strategy:
 * 1. Check cache for existing questions
 * 2. Generate new questions with Gemini if cache miss
 * 3. Store generated questions in cache for future reuse
 */
export interface IQuizService {
    /**
     * Generates quiz questions for a training unit.
     * Implementation should use hybrid strategy: cache lookup → Gemini generation → cache storage.
     * 
     * @param unit The training unit to generate quiz for
     * @param count Number of questions to generate (default: 2-3)
     * @param fileSearchStoreId Optional Gemini file search store ID
     * @param language Output language for questions
     * @returns Array of quiz questions
     */
    generateQuizQuestions(
        unit: TrainingUnit,
        count: number,
        fileSearchStoreId?: string,
        language?: string
    ): Promise<QuizQuestion[]>;
}
