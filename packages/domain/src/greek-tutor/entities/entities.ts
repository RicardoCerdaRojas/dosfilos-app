
export interface GreekForm {
    text: string;           // The Greek word/phrase (e.g., "en arche")
    transliteration: string; // "en arche"
    lemma: string;          // Root form
    morphology: string;     // e.g., "V-AAI-3S"
    gloss: string;          // Basic English/Spanish definition
    grammaticalCategory: string; // "Verb", "Preposition", etc.
}

export interface TrainingUnit {
    id: string;
    sessionId: string;
    greekForm: GreekForm;

    // 1. Identification
    identification: string; // "This is an aorist passive..."

    // 2. Recognition Guidance (Optional)
    recognitionGuidance?: string; // "Notice the 'theta-eta'..."

    // 3. Function in Context
    functionInContext: string; // "It introduces the agent..."

    // 4. Exegetical Significance
    significance: string; // "It emphasizes the completed action..."

    // 5. Reflective Question
    reflectiveQuestion: string; // "How does this change the meaning?"

    // Phase 3A: Progress tracking
    progress?: UnitProgress;

    // Phase 3C: Cached morphology breakdown
    morphologyBreakdown?: MorphologyBreakdown;
}

/**
 * Chat message for free-form questions about a training unit.
 * Stored only in session memory, not persisted to Firestore.
 */
export interface ChatMessage {
    id: string;
    unitId: string;
    question: string;
    answer: string;
    timestamp: Date;
}

export interface UserResponse {
    id: string;
    unitId: string;
    userAnswer: string;
    feedback: string; // AI corrective/affirming feedback
    isCorrect: boolean; // Logical correctness judgment
    createdAt: Date;
}

export interface StudySession {
    id: string;
    userId: string;
    passage: string; // e.g., "John 1:1"
    createdAt: Date;
    updatedAt: Date;
    status: 'ACTIVE' | 'COMPLETED';
    units: TrainingUnit[];
    responses: Record<string, UserResponse>; // Map unitId -> Response

    // Phase 3A: Session-level progress tracking
    sessionProgress?: SessionProgress;
}

export interface ExegeticalInsight {
    id: string;
    sessionId: string;
    unitId: string;
    content: string; // The insight text to save
    tags: string[];
    createdAt: Date;
}

export interface MorphemeComponent {
    part: string;           // The morpheme itself (e.g., "συν", "εσθε")
    type: 'prefix' | 'root' | 'formative' | 'ending' | 'other';
    meaning: string;        // Explanation (e.g., "con/junto", "2da plural imperativo")
}

export interface MorphologyBreakdown {
    word: string;           // The complete Greek word
    components: MorphemeComponent[];
    summary: string;        // Overall explanation of what the ending indicates
}

/**
 * Quiz question for testing comprehension of a training unit.
 * Part of Phase 3A: Interactive Elements
 */
export interface QuizQuestion {
    id: string;
    unitId: string; // Associated TrainingUnit
    type: 'multiple-choice' | 'true-false' | 'fill-blank';
    question: string;
    options?: string[]; // For multiple-choice (4 options recommended)
    correctAnswer: string;
    explanation: string; // Why the answer is correct
    createdAt: Date;
    // Cache metadata
    cacheKey?: string; // For matching similar units (e.g., same grammar form)
    usageCount?: number; // How many times this question has been used
}

/**
 * User's attempt at answering a quiz question.
 * Tracks quiz interaction history.
 */
export interface QuizAttempt {
    id: string;
    unitId: string;
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    attemptedAt: Date;
}

/**
 * Progress tracking for a single training unit.
 * Follows Open/Closed Principle - extends TrainingUnit without modification.
 */
export interface UnitProgress {
    viewedSections: string[]; // ['morphology', 'recognition', 'context', 'significance']
    quizAttempts: QuizAttempt[];
    masteryLevel: 0 | 1 | 2 | 3; // 0=not viewed, 1=viewed, 2=practiced, 3=mastered
    lastViewedAt?: Date;
    studyTimeSeconds?: number; // Total time spent on this unit
}

/**
 * Overall session progress tracking.
 * Aggregates progress across all units in a session.
 */
export interface SessionProgress {
    startedAt: Date;
    lastActivityAt: Date;
    totalStudyTimeSeconds: number;
    unitsCompleted: number; // Units with masteryLevel >= 2
    quizAccuracy: number; // Percentage of correct quiz answers (0-100)
}

// ============================================================================
// Phase 3B: Interactive Passage Reader Entities
// ============================================================================

/**
 * Represents a biblical passage in multiple versions for interactive reading
 */
export interface BiblicalPassage {
    reference: string;           // e.g., "Romanos 12:1-2"
    rv60Text: string;            // Complete text in Spanish (RV60)
    greekText: string;           // Complete text in Greek
    transliteration: string;     // Complete transliteration
    words: PassageWord[];        // Tokenized words with alignments
}

/**
 * Represents an individual word from the passage with alignment data
 */
export interface PassageWord {
    id: string;                  // Unique identifier
    greek: string;               // Greek word
    transliteration: string;     // Transliteration of the word
    spanish: string;             // Corresponding Spanish word(s) from RV60
    position: number;            // Position in the text (0-indexed)
    lemma?: string;              // Lemma form (if available)
    isInUnits: boolean;          // Whether this word is already in training units
}

/**
 * Preview of a training unit before adding it to the study session
 */
export interface UnitPreview {
    greekForm: GreekForm;        // Complete Greek form identification
    identification: string;      // Grammatical identification
    recognitionGuidance?: string; // Optional recognition tips
}
