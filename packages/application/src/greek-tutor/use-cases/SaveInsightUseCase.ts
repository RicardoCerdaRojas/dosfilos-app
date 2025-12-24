import { ISessionRepository, ExegeticalInsight } from '@dosfilos/domain';

/**
 * Use Case: Save Exegetical Insight
 * 
 * Responsibility: Orchestrate the saving of a tutor response as a personal insight
 * Following Single Responsibility Principle
 */
export class SaveInsightUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    async execute(params: {
        userId: string;
        sessionId: string;
        unitId?: string;
        title?: string;
        content: string;
        question?: string;
        tags?: string[];
        passage?: string;
        greekWord?: string;
    }): Promise<ExegeticalInsight> {
        // Validation
        if (!params.userId) {
            throw new Error('userId is required');
        }
        if (!params.content || params.content.trim().length === 0) {
            throw new Error('content cannot be empty');
        }

        // Auto-generate title if not provided
        const title = params.title?.trim() || this.generateTitle(params);

        // Sanitize tags
        const tags = this.sanitizeTags(params.tags || []);

        // Create insight entity
        const insight: ExegeticalInsight = {
            id: crypto.randomUUID(),
            userId: params.userId,
            sessionId: params.sessionId,
            unitId: params.unitId,
            title,
            content: params.content.trim(),
            question: params.question?.trim(),
            tags,
            passage: params.passage?.trim(),
            greekWord: params.greekWord?.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Persist
        await this.sessionRepository.saveInsight(insight);

        console.log('[SaveInsightUseCase] Saved insight:', insight.id);
        return insight;
    }

    private generateTitle(params: {
        question?: string;
        greekWord?: string;
        passage?: string;
    }): string {
        if (params.question) {
            const firstLine = params.question.split('\n')[0].trim();
            if (firstLine.length > 0) {
                return firstLine.length > 60
                    ? firstLine.substring(0, 57) + '...'
                    : firstLine;
            }
        }

        if (params.greekWord && params.passage) {
            return `${params.greekWord} en ${params.passage}`;
        }

        if (params.greekWord) {
            return `Estudio de ${params.greekWord}`;
        }

        if (params.passage) {
            return `Insight de ${params.passage}`;
        }

        return 'Insight del Tutor';
    }

    private sanitizeTags(tags: string[]): string[] {
        return tags
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .filter((tag, index, self) => self.indexOf(tag) === index)
            .slice(0, 10);
    }
}
