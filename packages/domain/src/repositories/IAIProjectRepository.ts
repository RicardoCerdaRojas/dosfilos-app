import { AIProject } from '../entities/AIProject';

export interface IAIProjectRepository {
    getUserProjects(userId: string): Promise<AIProject[]>;
    getProject(projectId: string): Promise<AIProject | null>;
    createProject(project: Omit<AIProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProject>;
    updateProject(projectId: string, updates: Partial<Pick<AIProject, 'title' | 'color' | 'icon' | 'contextNote'>>): Promise<AIProject>;
    deleteProject(projectId: string): Promise<void>;
}
