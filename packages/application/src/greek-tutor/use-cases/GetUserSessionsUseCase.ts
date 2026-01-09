import { ISessionRepository, StudySession } from '@dosfilos/domain';

/**
 * Filters for querying user sessions
 */
export interface SessionFilters {
    status?: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    fromDate?: Date;
    toDate?: Date;
    passageContains?: string;
}

/**
 * Use case: Get all sessions for a user with optional filtering
 * 
 * Retrieves user's study sessions from repository with optional filters
 * for status, date range, and passage content.
 */
export class GetUserSessionsUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    /**
     * Executes the use case
     * @param userId User ID to fetch sessions for
     * @param filters Optional filters to apply
     * @returns Array of study sessions matching criteria
     */
    async execute(
        userId: string,
        filters?: SessionFilters
    ): Promise<StudySession[]> {

        try {
            // Get all sessions for user
            let sessions = await this.sessionRepository.getAllSessions(userId);

            // Apply filters if provided
            if (filters) {
                sessions = this.applyFilters(sessions, filters);
            }

            // Sort by most recent first
            sessions.sort((a: StudySession, b: StudySession) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            return sessions;
        } catch (error) {
            console.error('[GetUserSessionsUseCase] Error fetching sessions:', error);
            throw new Error(`Failed to fetch user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Applies filters to session list
     */
    private applyFilters(sessions: StudySession[], filters: SessionFilters): StudySession[] {
        let filtered = sessions;

        // Filter by status
        if (filters.status) {
            filtered = filtered.filter(s => s.status === filters.status);
        }

        // Filter by date range
        if (filters.fromDate) {
            filtered = filtered.filter(s =>
                new Date(s.createdAt) >= filters.fromDate!
            );
        }

        if (filters.toDate) {
            filtered = filtered.filter(s =>
                new Date(s.createdAt) <= filters.toDate!
            );
        }

        // Filter by passage content
        if (filters.passageContains) {
            const searchTerm = filters.passageContains.toLowerCase();
            filtered = filtered.filter(s =>
                s.passage.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }
}
