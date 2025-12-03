import { WorkflowConfiguration } from '../entities/WorkflowConfiguration';

export interface IConfigRepository {
    save(config: WorkflowConfiguration): Promise<void>;
    findByUserId(userId: string): Promise<WorkflowConfiguration | null>;
}
