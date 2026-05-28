/**
 * Phase 2.5 PR B (ADR-028) — Pause the guided sermon (resumable).
 *
 * Sets `status: 'paused'`. The session is dormant; the next "Activar guía"
 * action resumes from the same step.
 */

import { pause, type IAIChatRepository } from '@dosfilos/domain';

export interface PauseGuidedSermonInput {
    userId: string;
    sessionId: string;
}

export class PauseGuidedSermonUseCase {
    constructor(private readonly chatRepo: IAIChatRepository) {}

    async execute(input: PauseGuidedSermonInput): Promise<void> {
        const session = await this.chatRepo.getSession(input.userId, input.sessionId);
        if (!session) throw new Error(`Session ${input.sessionId} not found.`);
        if (!session.guidedSermonSession) return; // nothing to pause
        const next = pause(session.guidedSermonSession);
        await this.chatRepo.updateGuidedSermonSession(input.userId, input.sessionId, next);
    }
}
