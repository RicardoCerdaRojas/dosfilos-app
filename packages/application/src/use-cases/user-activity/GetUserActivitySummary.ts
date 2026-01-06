import { IUserActivityRepository } from '@dosfilos/domain';
import { IUserRepository } from '@dosfilos/domain';
import { UserActivitySummary } from '@dosfilos/domain';

/**
 * Use Case: Get User Activity Summary
 * 
 * Retrieves comprehensive activity metrics for a specific user
 * including all content creation counts and recent activity
 */
export class GetUserActivitySummary {
    constructor(
        private userActivityRepo: IUserActivityRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(userId: string): Promise<UserActivitySummary> {
        // Verify user exists
        const user = await this.userRepo.getUserById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Get aggregated activity summary
        const summary = await this.userActivityRepo.getUserActivitySummary(userId);

        if (!summary) {
            throw new Error(`Could not retrieve activity summary for user: ${userId}`);
        }

        return summary;
    }
}
