import { ISessionRepository } from '@dosfilos/domain';

/**
 * Use Case: Delete Insight
 * 
 * Responsibility: Delete a user's insight
 * Following Single Responsibility Principle
 */
export class DeleteInsightUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    async execute(userId: string, insightId: string): Promise<void> {
        // Validation
        if (!userId) {
            throw new Error('userId is required');
        }
        if (!insightId) {
            throw new Error('insightId is required');
        }

        // Delete from repository
        await this.sessionRepository.deleteInsight(userId, insightId);

        console.log(`[DeleteInsightUseCase] Deleted insight ${insightId} for user ${userId}`);
    }
}
