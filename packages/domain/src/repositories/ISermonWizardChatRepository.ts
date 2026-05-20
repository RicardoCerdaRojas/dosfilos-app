import type { ChatMessage as SermonWorkflowChatMessage } from '../entities/SermonWorkflow';

type ChatMessage = SermonWorkflowChatMessage;

/**
 * Persisted chat history for the sermon wizard's per-phase assistant
 * (`exegesis` / `homiletics` / `sermon`). Each `(sermonId, phase)`
 * tuple owns one document — the wizard never has more than 3 chat
 * threads per sermon, so a per-document model keeps reads + writes
 * atomic + simple instead of using a messages subcollection.
 *
 * Pre-PR #219 the chat lived in localStorage with a 7-day TTL. That
 * meant a wizard tab refresh, cross-device session, or browser data
 * clear silently lost the refinement conversation. Persisting to
 * Firestore eliminates the data-loss class entirely — auto-save
 * elsewhere in the wizard (useAutoSave on `wizardProgress`) already
 * established the per-sermon document is the source of truth; the
 * chat is just another field on the sermon's surface.
 */

export type SermonWizardChatPhase = 'exegesis' | 'homiletics' | 'sermon';

export interface SermonWizardChatSource {
    author?: string;
    title?: string;
    page?: string;
    snippet?: string;
    relevance?: number;
}

/**
 * The serialized chat snapshot. Mirrors the in-memory shape held by
 * `GeneratorChatService` but with `messages.timestamp` as Date.
 *
 * `sourcesPerMessage` keys by the message's id (or a synthetic id when
 * one is missing) so the UI can render the source pills next to the
 * matching message.
 */
export interface SermonWizardChatHistory {
    sermonId: string;
    phase: SermonWizardChatPhase;
    messages: ChatMessage[];
    sourcesPerMessage: Record<string, SermonWizardChatSource[]>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISermonWizardChatRepository {
    /**
     * Returns the current persisted chat for the `(sermonId, phase)`
     * tuple, or `null` when no history exists yet. The repository
     * never throws on "not found" — empty conversations and missing
     * documents collapse to the same case.
     */
    load(sermonId: string, phase: SermonWizardChatPhase): Promise<SermonWizardChatHistory | null>;

    /**
     * Replaces the document with the provided snapshot. Caller is
     * responsible for stamping `updatedAt` (the repo serializes it
     * directly). Idempotent — calling save twice with the same
     * snapshot produces the same persisted state.
     */
    save(history: SermonWizardChatHistory): Promise<void>;

    /**
     * Deletes the chat history for one phase or for the whole sermon.
     * Pass `phase` to clear a single phase (matches the
     * `clearHistory()` UX); omit to clean up all phases (called when
     * the sermon is hard-deleted).
     */
    clear(sermonId: string, phase?: SermonWizardChatPhase): Promise<void>;
}
