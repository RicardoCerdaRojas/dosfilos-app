import { ISessionRepository, SessionsPage } from '@dosfilos/domain';

/**
 * Use case: paginated read of a user's Greek study sessions for the dashboard.
 *
 * Thin wrapper over `ISessionRepository.getSessionsPage`. The dashboard does
 * its own client-side filtering + sorting over the loaded pages, so this use
 * case stays a pass-through (no server-side filters) — its only job is to cap
 * the payload by pulling one page at a time instead of every full session doc.
 */
export class GetUserSessionsPageUseCase {
    constructor(private sessionRepository: ISessionRepository) {}

    async execute(userId: string, pageSize: number, cursorCreatedAt?: Date): Promise<SessionsPage> {
        try {
            return await this.sessionRepository.getSessionsPage(userId, pageSize, cursorCreatedAt);
        } catch (error) {
            console.error('[GetUserSessionsPageUseCase] Error fetching sessions page:', error);
            throw new Error(
                `Failed to fetch sessions page: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
