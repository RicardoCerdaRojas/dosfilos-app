
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
