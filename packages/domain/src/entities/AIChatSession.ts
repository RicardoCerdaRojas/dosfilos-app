import { SourceReference, ConcreteResponseMode } from '../services/IAIGeneratorService';

export type MessageRole = 'user' | 'model' | 'system';

export interface AIChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    sources?: SourceReference[];
    /** Concrete response mode used by the model when generating this message. */
    modeUsed?: ConcreteResponseMode;
    /** True when `modeUsed` was auto-inferred by the router (user picked 'auto'). */
    modeWasAuto?: boolean;
}

export interface AIChatSession {
    id: string;
    userId: string;
    agentId: string;
    title: string;
    projectId?: string;   // Optional: links session to an AIProject
    createdAt: Date;
    updatedAt: Date;
    messages: AIChatMessage[];
}

