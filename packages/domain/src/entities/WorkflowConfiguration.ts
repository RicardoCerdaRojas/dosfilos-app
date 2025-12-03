import { WorkflowPhase } from './SermonWorkflow';

export interface PhaseDocument {
    id: string;
    name: string;
    content?: string; // Extracted text (optional if stored in Storage)
    storagePath?: string; // Path in Firebase Storage
    type: string;
}

export interface PhaseConfiguration {
    basePrompt?: string; // The core "Expert Persona" prompt
    userPrompts: string[]; // Additional specific instructions
    documents: PhaseDocument[]; // Knowledge base documents
    temperature?: number; // Creativity level
}

export interface WorkflowConfiguration {
    id: string;
    userId: string;

    // Global Settings
    preferredBibleVersion: string;
    theologicalBias?: string;
    hermeneuticalApproach?: string; // e.g. "Historical-Grammatical", "Christocentric"
    defaultTargetAudience?: string;

    // Phase-specific settings
    [WorkflowPhase.EXEGESIS]: PhaseConfiguration;
    [WorkflowPhase.HOMILETICS]: PhaseConfiguration;
    [WorkflowPhase.DRAFTING]: PhaseConfiguration;

    updatedAt: Date;
}

export const DEFAULT_WORKFLOW_CONFIG: Omit<WorkflowConfiguration, 'id' | 'userId' | 'updatedAt'> = {
    preferredBibleVersion: 'Reina Valera 1960',
    [WorkflowPhase.EXEGESIS]: {
        userPrompts: [],
        documents: [],
        temperature: 0.3
    },
    [WorkflowPhase.HOMILETICS]: {
        userPrompts: [],
        documents: [],
        temperature: 0.7
    },
    [WorkflowPhase.DRAFTING]: {
        userPrompts: [],
        documents: [],
        temperature: 0.7
    }
};
