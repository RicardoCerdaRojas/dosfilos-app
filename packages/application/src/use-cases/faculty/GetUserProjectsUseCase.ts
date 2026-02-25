import { IAIProjectRepository, AIProject } from '@dosfilos/domain';

export class GetUserProjectsUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) { }

    async execute(userId: string): Promise<AIProject[]> {
        return this.projectRepository.getUserProjects(userId);
    }
}
