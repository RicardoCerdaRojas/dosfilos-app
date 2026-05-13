import { Extraction, ExtractionExternalRef, ExtractionType } from '../entities/Extraction';

/**
 * Payload accepted by `create()`. Caller supplies everything except the
 * server-generated id and timestamps. `version` defaults to 1 server-side.
 */
export interface CreateExtractionInput {
    userId: string;
    sessionId: string;
    type: ExtractionType;
    title: string;
    markdown: string;
    derivedFromMessageIds: string[];
    externalRef?: ExtractionExternalRef | null;
    projectIds?: string[];
}

/**
 * Repository port for persisted Faculty extractions. Implementations
 * live in @dosfilos/infrastructure; the application layer depends only
 * on this port. Top-level collection (cross-session/cross-project
 * queries are first-class).
 */
export interface IExtractionRepository {
    /** Creates an extraction. Server stamps id + createdAt/updatedAt + version=1. */
    create(input: CreateExtractionInput): Promise<Extraction>;

    /** Returns the artifact or null if not found / not owned by userId. */
    getById(userId: string, extractionId: string): Promise<Extraction | null>;

    /** All extractions for a session, newest first. */
    listBySession(userId: string, sessionId: string): Promise<Extraction[]>;

    /** All extractions pinned to a project, newest first. */
    listByProject(userId: string, projectId: string): Promise<Extraction[]>;

    /** All extractions owned by the user across sessions, newest first. */
    listByUser(userId: string): Promise<Extraction[]>;

    /** Replaces the markdown body, bumps version, updates updatedAt. */
    updateMarkdown(userId: string, extractionId: string, markdown: string): Promise<void>;

    /** Renames the artifact (does not bump version). */
    rename(userId: string, extractionId: string, title: string): Promise<void>;

    /** Adds projectId to the artifact's projectIds array. Idempotent. */
    addToProject(userId: string, extractionId: string, projectId: string): Promise<void>;

    /** Removes projectId from the artifact's projectIds array. Idempotent. */
    removeFromProject(userId: string, extractionId: string, projectId: string): Promise<void>;

    /** Hard-deletes the artifact. */
    delete(userId: string, extractionId: string): Promise<void>;

    /**
     * Called when a session is deleted. Sets sessionId=null +
     * sourceSessionDeleted=true on every extraction whose sessionId
     * matches. Artifacts survive — only their origin link is severed.
     */
    orphanBySession(userId: string, sessionId: string): Promise<void>;

    /**
     * Called when a project is deleted. Removes projectId from every
     * artifact's `projectIds` array. Artifacts pinned to other
     * projects still survive in those project libraries; artifacts
     * pinned only to the deleted project become library-orphans
     * (visible in cross-session view, no project chips).
     */
    orphanByProject(userId: string, projectId: string): Promise<void>;
}
