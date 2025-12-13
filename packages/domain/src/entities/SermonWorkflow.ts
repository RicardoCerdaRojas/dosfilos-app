export enum WorkflowPhase {
    PLANNING = 'planning',
    EXEGESIS = 'exegesis',
    HOMILETICS = 'homiletics',
    DRAFTING = 'drafting',
    COMPLETED = 'completed'
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface PhaseResult {
    content: string; // The main output (e.g., exegesis doc, sermon draft)
    metadata: Record<string, any>; // Extra data (e.g., proposition, selected angle)
    chatHistory: ChatMessage[]; // The conversation that led to this result
    isFinalized: boolean;
}

export interface SermonWorkflow {
    id: string;
    userId: string;
    sermonId?: string; // Linked sermon if one is created/finalized

    biblePassage: string;
    currentPhase: WorkflowPhase;

    // Results from each phase
    exegesisResult?: PhaseResult;
    homileticsResult?: PhaseResult;
    draftingResult?: PhaseResult;

    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkflowDTO {
    userId: string;
    biblePassage: string;
}
