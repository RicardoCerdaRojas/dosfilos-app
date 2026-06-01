import { AIChatSession, AIChatMessage } from '../entities/AIChatSession';

export interface IAIChatRepository {
    getSession(userId: string, sessionId: string): Promise<AIChatSession | null>;
    getUserSessions(userId: string): Promise<AIChatSession[]>;
    /**
     * Trimmed list read for the sidebar/dashboard — returns sessions WITHOUT
     * their `messages` (set to `[]`) but with `messageCount`, so the list
     * payload stays tiny. The full transcript is fetched via `getSession`
     * only when a session is opened.
     */
    getUserSessionSummaries(userId: string): Promise<AIChatSession[]>;
    createSession(session: Omit<AIChatSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIChatSession>;
    updateSession(session: AIChatSession): Promise<void>;
    deleteSession(userId: string, sessionId: string): Promise<void>;
    addMessageToSession(userId: string, sessionId: string, message: AIChatMessage): Promise<void>;
    deleteMessage(userId: string, sessionId: string, messageId: string): Promise<void>;
    /** Sets or clears the projectId on a single session. */
    updateSessionProject(userId: string, sessionId: string, projectId: string | null): Promise<void>;
    /** Removes projectId from all sessions that belong to the given project (used on project deletion). */
    clearProjectFromSessions(userId: string, projectId: string): Promise<void>;
    /** Renames a session. */
    renameSession(userId: string, sessionId: string, title: string): Promise<void>;
    /**
     * Phase 2.5 PR B (ADR-028) — set or clear the guided-sermon agent state
     * on a session. Atomic write so it does not race with
     * `addMessageToSession`. Pass `null` to clear (pastor exits guided mode
     * or seed graduates to a sermon).
     */
    updateGuidedSermonSession(
        userId: string,
        sessionId: string,
        guidedSermonSession: AIChatSession['guidedSermonSession'] | null,
    ): Promise<void>;
}

