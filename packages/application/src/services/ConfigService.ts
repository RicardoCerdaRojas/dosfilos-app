import {
    WorkflowConfiguration,
    IConfigRepository,
    DEFAULT_WORKFLOW_CONFIG
} from '@dosfilos/domain';

export class ConfigService {
    constructor(private repository: IConfigRepository) { }

    async getUserConfig(userId: string): Promise<WorkflowConfiguration> {
        const config = await this.repository.findByUserId(userId);
        if (config) return config;

        // Return default config if none exists
        return {
            id: crypto.randomUUID(),
            userId,
            ...DEFAULT_WORKFLOW_CONFIG,
            updatedAt: new Date()
        };
    }

    async saveConfig(config: WorkflowConfiguration): Promise<void> {
        config.updatedAt = new Date();
        await this.repository.save(config);
    }
}
