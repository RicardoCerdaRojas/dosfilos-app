import { AIAgent, AIAgentRole } from '../entities/AIAgent';

export interface IAIAgentRepository {
    getAgent(id: string): Promise<AIAgent | null>;
    getAgentByRole(role: AIAgentRole): Promise<AIAgent | null>;
    getAllAgents(): Promise<AIAgent[]>;
    createAgent(agent: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAgent>;
    updateAgent(id: string, updates: Partial<AIAgent>): Promise<AIAgent>;
    deleteAgent(id: string): Promise<void>;
}
