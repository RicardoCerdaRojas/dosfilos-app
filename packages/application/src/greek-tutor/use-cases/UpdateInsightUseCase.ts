import { ISessionRepository, ExegeticalInsight } from '@dosfilos/domain';

/**
 * Use Case: Update Insight
 * 
 * Responsibility: Update insight title, tags, or other editable fields
 * Following Single Responsibility Principle
 */
export class UpdateInsightUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    async execute(
        userId: string,
        insightId: string,
        updates: {
            title?: string;
            tags?: string[];
        }
    ): Promise<void> {
        // Validation
        if (!userId) {
            throw new Error('userId is required');
        }
        if (!insightId) {
            throw new Error('insightId is required');
        }

        // Validate and sanitize updates
        const sanitizedUpdates: Partial<ExegeticalInsight> = {
            userId // Required for repository to locate document
        };

        if (updates.title !== undefined) {
            const trimmedTitle = updates.title.trim();
            if (trimmedTitle.length === 0) {
                throw new Error('title cannot be empty');
            }
            sanitizedUpdates.title = trimmedTitle;
        }

        if (updates.tags !== undefined) {
            sanitizedUpdates.tags = this.sanitizeTags(updates.tags);
        }

        // Update in repository
        await this.sessionRepository.updateInsight(insightId, sanitizedUpdates);

        console.log(`[UpdateInsightUseCase] Updated insight ${insightId}`);
    }

    private sanitizeTags(tags: string[]): string[] {
        return tags
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .filter((tag, index, self) => self.indexOf(tag) === index)
            .slice(0, 10);
    }
}
