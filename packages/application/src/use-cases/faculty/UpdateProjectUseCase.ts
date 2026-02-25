import { IAIProjectRepository, AIProject, ProjectColor } from '@dosfilos/domain';

export interface UpdateProjectDTO {
    title?: string;
    color?: ProjectColor;
    icon?: string;
    contextNote?: string;
}

export class UpdateProjectUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) { }

    async execute(projectId: string, dto: UpdateProjectDTO): Promise<AIProject> {
        return this.projectRepository.updateProject(projectId, {
            ...(dto.title !== undefined && { title: dto.title.trim() }),
            ...(dto.color !== undefined && { color: dto.color }),
            ...(dto.icon !== undefined && { icon: dto.icon }),
            ...(dto.contextNote !== undefined && { contextNote: dto.contextNote.trim() || undefined }),
        });
    }
}
