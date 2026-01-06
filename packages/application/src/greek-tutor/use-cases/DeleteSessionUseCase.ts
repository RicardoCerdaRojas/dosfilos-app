import { ISessionRepository } from '@dosfilos/domain';

/**
 * Use case: Delete a study session
 * 
 * Removes a session from the repository. Should include validation
 * to ensure the user owns the session before deletion.
 */
export class DeleteSessionUseCase {
    constructor(private sessionRepository: ISessionRepository) { }

    /**
     * Executes the use case
     * @param sessionId Session ID to delete
     * @param userId User ID (for validation)
     * @throws Error if session not found or user doesn't own it
     */
    async execute(sessionId: string, userId: string): Promise<void> {
        console.log('[DeleteSessionUseCase] Deleting session:', sessionId);

        try {
            // Verify session exists and belongs to user
            const session = await this.sessionRepository.getSession(sessionId);

            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            if (session.userId !== userId) {
                throw new Error(`User ${userId} does not own session ${sessionId}`);
            }

            // Delete the session
            await this.sessionRepository.deleteSession(sessionId);

            console.log('[DeleteSessionUseCase] Successfully deleted session');
        } catch (error) {
            console.error('[DeleteSessionUseCase] Error deleting session:', error);
            throw error;
        }
    }
}
