import { IAIAgentRepository, AIAgent } from '@dosfilos/domain';

export class GetFacultyAgentsUseCase {
    constructor(private agentRepository: IAIAgentRepository) { }

    async execute(): Promise<AIAgent[]> {
        return await this.agentRepository.getAllAgents();
    }
}
