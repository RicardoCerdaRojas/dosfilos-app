// AIAgentRole is now a dynamic string to support Superadmin-created roles.
export type AIAgentRole = string;

export interface AIAgent {
    id: string;
    name: string;
    role: AIAgentRole;
    systemInstruction: string;
    expertiseArea: string;
    /**
     * Optional disambiguation description used exclusively by the orchestrator router.
     * Can include "USE FOR:" and "NOT FOR:" clauses so the router makes precise decisions.
     * Falls back to `expertiseArea` when absent.
     */
    routingDescription?: string;
    icon?: string;
    description: string;
    isActive: boolean; // Flag to enable/disable agents
    corpusIds?: string[]; // Knowledge Base identifiers for RAG
    createdAt?: Date;
    updatedAt?: Date;
}

