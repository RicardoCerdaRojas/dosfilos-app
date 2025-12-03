import { SermonWorkflow } from '../entities/SermonWorkflow';

export interface IWorkflowRepository {
    save(workflow: SermonWorkflow): Promise<void>;
    findById(id: string): Promise<SermonWorkflow | null>;
    findByUserId(userId: string): Promise<SermonWorkflow[]>;
    delete(id: string): Promise<void>;
}
