import { IUserActivityRepository } from '@dosfilos/domain';
import { ContentActivity } from '@dosfilos/domain';

/**
 * Use Case: Get User Recent Content
 * 
 * Retrieves recent content created by a user within specified days
 * Useful for activity timelines and "created today" views
 */
export class GetUserRecentContent {
    constructor(
        private userActivityRepo: IUserActivityRepository
    ) { }

    async execute(userId: string, days: number = 7): Promise<ContentActivity[]> {
        if (days < 1 || days > 90) {
            throw new Error('Days must be between 1 and 90');
        }

        return await this.userActivityRepo.getRecentContent(userId, days);
    }

    /**
     * Get content created today
     */
    async getToday(userId: string): Promise<ContentActivity[]> {
        return this.execute(userId, 1);
    }

    /**
     * Get content created this week
     */
    async getThisWeek(userId: string): Promise<ContentActivity[]> {
        return this.execute(userId, 7);
    }
}
