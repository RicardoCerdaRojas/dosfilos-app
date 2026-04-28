import { IAIProjectRepository, AIProject, ProjectColor, ProjectType } from '@dosfilos/domain';

export interface UpdateProjectDTO {
    title?: string;
    color?: ProjectColor;
    type?: ProjectType;
    icon?: string;
    contextNote?: string;
    /** Attached library_resource IDs (project-scoped source set). Pass [] to detach all. */
    sourceIds?: string[];
}

export class UpdateProjectUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) { }

    async execute(projectId: string, dto: UpdateProjectDTO): Promise<AIProject> {
        return this.projectRepository.updateProject(projectId, {
            ...(dto.title !== undefined && { title: dto.title.trim() }),
            ...(dto.color !== undefined && { color: dto.color }),
            ...(dto.type !== undefined && { type: dto.type }),
            ...(dto.icon !== undefined && { icon: dto.icon }),
            ...(dto.contextNote !== undefined && { contextNote: dto.contextNote.trim() || undefined }),
            ...(dto.sourceIds !== undefined && { sourceIds: dto.sourceIds }),
        });
    }
}
