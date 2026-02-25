import { IAIProjectRepository, AIProject, ProjectColor } from '@dosfilos/domain';

export interface CreateProjectDTO {
    userId: string;
    title: string;
    color: ProjectColor;
    icon?: string;
    contextNote?: string;
}

export class CreateProjectUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) { }

    async execute(dto: CreateProjectDTO): Promise<AIProject> {
        return this.projectRepository.createProject({
            userId: dto.userId,
            title: dto.title.trim(),
            color: dto.color,
            icon: dto.icon,
            contextNote: dto.contextNote?.trim() || undefined,
        });
    }
}
