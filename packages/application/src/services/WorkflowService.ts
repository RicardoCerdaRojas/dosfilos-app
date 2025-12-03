import {
    SermonWorkflow,
    WorkflowPhase,
    IWorkflowRepository,
    ISermonGenerator,
    CreateWorkflowDTO
} from '@dosfilos/domain';

export class WorkflowService {
    constructor(
        private repository: IWorkflowRepository,
        private sermonGenerator: ISermonGenerator
    ) { }

    async createWorkflow(dto: CreateWorkflowDTO): Promise<SermonWorkflow> {
        const workflow: SermonWorkflow = {
            id: crypto.randomUUID(),
            userId: dto.userId,
            biblePassage: dto.biblePassage,
            currentPhase: WorkflowPhase.EXEGESIS,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await this.repository.save(workflow);
        return workflow;
    }

    async getWorkflow(id: string): Promise<SermonWorkflow | null> {
        return this.repository.findById(id);
    }

    async getUserWorkflows(userId: string): Promise<SermonWorkflow[]> {
        return this.repository.findByUserId(userId);
    }

    async deleteWorkflow(id: string): Promise<void> {
        return this.repository.delete(id);
    }

    async chat(workflowId: string, message: string): Promise<string> {
        const workflow = await this.repository.findById(workflowId);
        if (!workflow) throw new Error('Workflow not found');

        // Placeholder: Real implementation will retrieve history and context
        return this.sermonGenerator.chat(
            workflow.currentPhase,
            [{ role: 'user', content: message, timestamp: new Date() }],
            {}
        );
    }
}
