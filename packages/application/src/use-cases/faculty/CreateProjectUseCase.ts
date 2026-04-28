import { IAIProjectRepository, AIProject, ProjectColor, ProjectType } from '@dosfilos/domain';

export interface CreateProjectDTO {
    userId: string;
    title: string;
    color: ProjectColor;
    type?: ProjectType;
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
            type: dto.type,
            icon: dto.icon,
            contextNote: dto.contextNote?.trim() || undefined,
        });
    }
}
