import { IExtractionRepository } from '@dosfilos/domain';

export class UpdateExtractionMarkdownUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string, markdown: string): Promise<void> {
        if (!markdown.trim()) throw new Error('Markdown cannot be empty');
        return this.repo.updateMarkdown(userId, extractionId, markdown);
    }
}
