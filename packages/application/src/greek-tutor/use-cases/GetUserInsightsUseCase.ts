import { ISessionRepository, ExegeticalInsight } from '@dosfilos/domain';

/**
 * Use Case: Get User Insights
 * 
 * Responsibility: Retrieve all insights for a user with optional filtering
 * Following Single Responsibility Principle
 */
export class GetUserInsightsUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    async execute(userId: string, filters?: {
        passage?: string;
        greekWord?: string;
        tags?: string[];
        searchTerm?: string;
    }): Promise<ExegeticalInsight[]> {
        // Validation
        if (!userId) {
            throw new Error('userId is required');
        }

        // Get all user insights from repository
        let insights = await this.sessionRepository.getUserInsights(userId);

        // Apply filters if provided
        if (filters) {
            insights = this.applyFilters(insights, filters);
        }

        console.log(`[GetUserInsightsUseCase] Retrieved ${insights.length} insights for user ${userId}`);
        return insights;
    }

    private applyFilters(
        insights: ExegeticalInsight[],
        filters: {
            passage?: string;
            greekWord?: string;
            tags?: string[];
            searchTerm?: string;
        }
    ): ExegeticalInsight[] {
        let filtered = insights;

        // Filter by passage
        if (filters.passage) {
            const passageNormalized = filters.passage.toLowerCase();
            filtered = filtered.filter(i =>
                i.passage?.toLowerCase().includes(passageNormalized)
            );
        }

        // Filter by Greek word
        if (filters.greekWord) {
            const wordNormalized = filters.greekWord.toLowerCase();
            filtered = filtered.filter(i =>
                i.greekWord?.toLowerCase().includes(wordNormalized)
            );
        }

        // Filter by tags (insights must have at least one matching tag)
        if (filters.tags && filters.tags.length > 0) {
            const tagsNormalized = filters.tags.map(t => t.toLowerCase());
            filtered = filtered.filter(i =>
                i.tags.some(tag => tagsNormalized.includes(tag.toLowerCase()))
            );
        }

        // Filter by search term (title, content, or question)
        if (filters.searchTerm) {
            const searchNormalized = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(i =>
                i.title.toLowerCase().includes(searchNormalized) ||
                i.content.toLowerCase().includes(searchNormalized) ||
                i.question?.toLowerCase().includes(searchNormalized)
            );
        }

        return filtered;
    }
}
