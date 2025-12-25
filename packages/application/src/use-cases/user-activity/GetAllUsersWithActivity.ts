import { IUserActivityRepository } from '@dosfilos/domain';
import { UserActivitySummary, UserActivityFilters } from '@dosfilos/domain';

/**
 * Use Case: Get All Users With Activity
 * 
 * Retrieves activity summaries for all users (admin view)
 * Supports filtering by plan, engagement, and content creation
 */
export class GetAllUsersWithActivity {
    constructor(
        private userActivityRepo: IUserActivityRepository
    ) { }

    async execute(filters?: UserActivityFilters): Promise<UserActivitySummary[]> {
        const summaries = await this.userActivityRepo.getAllUsersActivitySummary(filters);

        // Sort by engagement score descending by default
        return summaries.sort((a, b) => b.engagementScore - a.engagementScore);
    }
}
