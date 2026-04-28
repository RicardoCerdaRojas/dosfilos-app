import { IAIProjectRepository, ProjectOutput, ProjectOutputKind, SourceReference } from '@dosfilos/domain';

/**
 * Tiny, focused use cases around project outputs. Outputs are the "saved
 * research artifacts" that accumulate in a project — notes, sermon drafts,
 * outlines, etc. — produced either by hand or captured from a chat session.
 */

export class ListProjectOutputsUseCase {
    constructor(private readonly repo: IAIProjectRepository) { }
    async execute(userId: string, projectId: string): Promise<ProjectOutput[]> {
        return this.repo.listOutputs(userId, projectId);
    }
}

export interface CreateOutputDTO {
    userId: string;
    projectId: string;
    kind: ProjectOutputKind;
    title: string;
    content: string;
    sources?: SourceReference[];
    sessionId?: string;
}

export class CreateProjectOutputUseCase {
    constructor(private readonly repo: IAIProjectRepository) { }
    async execute(dto: CreateOutputDTO): Promise<ProjectOutput> {
        if (!dto.title.trim()) throw new Error('El título es obligatorio');
        return this.repo.createOutput({
            userId: dto.userId,
            projectId: dto.projectId,
            kind: dto.kind,
            title: dto.title.trim(),
            content: dto.content,
            sources: dto.sources,
            sessionId: dto.sessionId,
        });
    }
}

export interface UpdateOutputDTO {
    userId: string;
    projectId: string;
    outputId: string;
    title?: string;
    content?: string;
    kind?: ProjectOutputKind;
}

export class UpdateProjectOutputUseCase {
    constructor(private readonly repo: IAIProjectRepository) { }
    async execute(dto: UpdateOutputDTO): Promise<ProjectOutput> {
        return this.repo.updateOutput(dto.userId, dto.projectId, dto.outputId, {
            ...(dto.title !== undefined && { title: dto.title.trim() }),
            ...(dto.content !== undefined && { content: dto.content }),
            ...(dto.kind !== undefined && { kind: dto.kind }),
        });
    }
}

export class DeleteProjectOutputUseCase {
    constructor(private readonly repo: IAIProjectRepository) { }
    async execute(userId: string, projectId: string, outputId: string): Promise<void> {
        return this.repo.deleteOutput(userId, projectId, outputId);
    }
}
