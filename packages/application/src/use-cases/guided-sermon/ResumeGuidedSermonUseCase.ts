/**
 * Phase 2.5 PR B (ADR-028) — Resume a paused guided sermon session.
 *
 * Idempotent: if the session is not paused (active or completed) this is
 * a no-op.
 */

import { resume, type IAIChatRepository } from '@dosfilos/domain';

export interface ResumeGuidedSermonInput {
    userId: string;
    sessionId: string;
}

export class ResumeGuidedSermonUseCase {
    constructor(private readonly chatRepo: IAIChatRepository) {}

    async execute(input: ResumeGuidedSermonInput): Promise<void> {
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        if (!session) throw new Error(`Session ${input.sessionId} not found.`);
        if (!session.guidedSermonSession) return;
        const next = resume(session.guidedSermonSession);
        await this.chatRepo.updateGuidedSermonSession(input.userId, input.sessionId, next);
    }
}
