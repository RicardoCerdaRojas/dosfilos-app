
import { StudySession, TrainingUnit, UserResponse, ExegeticalInsight, MorphologyBreakdown } from "../entities/entities";

export interface IGreekTutorService {

    /**
     * Identifies exegetically significant Greek forms in the passage
     * based on FileSearchStore corpus validation.
     * @param passage The Bible reference (e.g., "John 1:1")
     * @param fileSearchStoreId The ID of the Exegesis Library Store
     * @param config Optional configuration for valid prompts
     */
    identifyForms(passage: string, fileSearchStoreId?: string, config?: { basePrompt?: string; userPrompts?: string[]; }, language?: string): Promise<string[]>; // Returns list of forms to study

    /**
     * Generates a full pedagogical unit for a specific Greek form.
     * @param form The Greek form/word to study
     * @param passage The context passage
     * @param fileSearchStoreId The ID of the Exegesis Library Store
     * @param config Optional configuration for valid prompts
     */
    createTrainingUnit(form: string, passage: string, fileSearchStoreId?: string, config?: { basePrompt?: string; userPrompts?: string[]; }, language?: string): Promise<TrainingUnit>;

    /**
     * Evaluates the user's answer to the reflective question.
     * @param unit The training unit being answered
     * @param userAnswer The user's input
     * @param fileSearchStoreId The ID of the Exegesis Library Store
     */
    evaluateResponse(unit: TrainingUnit, userAnswer: string, fileSearchStoreId?: string, language?: string): Promise<{ feedback: string; isCorrect: boolean }>;

    /**
     * Provides morphological breakdown of a Greek word.
     * @param word The Greek word to analyze
     * @param passage The context passage
     * @param fileSearchStoreId The ID of the Exegesis Library Store
     * @param language Output language
     */
    explainMorphology(word: string, passage: string, fileSearchStoreId?: string, language?: string): Promise<MorphologyBreakdown>;

    /**
     * Answers a free-form question about a Greek word in context.
     * @param question User's question
     * @param context Context information about the word being studied
     * @param fileSearchStoreId The ID of the Exegesis Library Store
     * @param language Output language
     */
    answerFreeQuestion(
        question: string,
        context: {
            greekWord: string;
            transliteration: string;
            gloss: string;
            identification: string;
            functionInContext: string;
            significance: string;
            passage: string;
        },
        fileSearchStoreId?: string,
        language?: string
    ): Promise<string>;
}

export interface ISessionRepository {
    createSession(session: StudySession): Promise<void>;
    getSession(sessionId: string): Promise<StudySession | null>;
    updateSession(session: StudySession): Promise<void>;
    saveInsight(insight: ExegeticalInsight): Promise<void>;
    getInsightsBySession(sessionId: string): Promise<ExegeticalInsight[]>;
}
