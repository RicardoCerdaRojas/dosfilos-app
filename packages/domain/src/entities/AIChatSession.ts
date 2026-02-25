export type MessageRole = 'user' | 'model' | 'system';

export interface AIChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
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

