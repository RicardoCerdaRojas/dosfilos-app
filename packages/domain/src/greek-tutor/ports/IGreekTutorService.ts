
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

    // Phase 3B: Passage Reader methods

    /**
     * Retrieves biblical passage in multiple versions (RV60, Greek, Transliteration)
     * @param reference Bible reference (e.g., "Romans 12:1-2")
     * @param fileSearchStoreId Optional store ID for enhanced accuracy
     * @param language Output language for transliteration
     */
    getPassageText(
        reference: string,
        fileSearchStoreId?: string,
        language?: string
    ): Promise<import('../entities/entities').BiblicalPassage>;

    /**
     * Identifies a word from the passage and generates unit preview
     * @param word The passage word to identify
     * @param context Full passage context
     * @param fileSearchStoreId Optional store ID for enhanced accuracy
     * @param language Output language
     */
    identifyWordForUnit(
        word: import('../entities/entities').PassageWord,
        context: string,
        fileSearchStoreId?: string,
        language?: string
    ): Promise<import('../entities/entities').UnitPreview>;

    /**
     * Analyzes the syntactic structure of a Greek passage
     * @param prompt The specialized analysis prompt
     * @returns Raw JSON string response from Gemini
     */
    analyzeSyntax(prompt: string): Promise<string>;
}

export interface ISessionRepository {
    createSession(session: import('../entities/entities').StudySession): Promise<void>;
    getSession(sessionId: string): Promise<import('../entities/entities').StudySession | null>;
    getAllSessions(userId: string): Promise<import('../entities/entities').StudySession[]>;
    updateSession(session: import('../entities/entities').StudySession): Promise<void>;
    saveInsight(insight: ExegeticalInsight): Promise<void>;
    getInsightsBySession(sessionId: string): Promise<ExegeticalInsight[]>;
    getUserInsights(userId: string): Promise<ExegeticalInsight[]>; // Get all user insights
    updateInsight(insightId: string, updates: Partial<ExegeticalInsight>): Promise<void>; // Update title/tags
    deleteInsight(userId: string, insightId: string): Promise<void>; // Delete insight

    // Phase 3A: Progress tracking methods
    updateUnitProgress(sessionId: string, unitId: string, progress: import('../entities/entities').UnitProgress): Promise<void>;
    saveQuizAttempt(sessionId: string, attempt: import('../entities/entities').QuizAttempt): Promise<void>;
    getSessionProgress(sessionId: string): Promise<import('../entities/entities').SessionProgress | null>;

    // Phase 3D: Passage caching (global cache for reuse across users/sessions)
    getCachedPassage(reference: string): Promise<import('../entities/entities').BiblicalPassage | null>;
    cachePassage(passage: import('../entities/entities').BiblicalPassage): Promise<void>;

    // Phase 4A: Session management
    deleteSession(sessionId: string): Promise<void>;

    // Phase 3A: Quiz caching methods (for hybrid generation strategy)
    getCachedQuiz(cacheKey: string): Promise<import('../entities/entities').QuizQuestion[]>;
    cacheQuiz(cacheKey: string, questions: import('../entities/entities').QuizQuestion[]): Promise<void>;

    // Phase 3C: Morphology persistence (to avoid regeneration)
    updateUnitMorphology(sessionId: string, unitId: string, morphology: import('../entities/entities').MorphologyBreakdown): Promise<void>;

    // Phase 4B: Syntax analysis caching (global cache, reusable across users/sessions)
    getCachedSyntaxAnalysis(reference: string): Promise<import('../syntax-analysis').PassageSyntaxAnalysis | null>;
    cacheSyntaxAnalysis(analysis: import('../syntax-analysis').PassageSyntaxAnalysis): Promise<void>;
}
