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
    projectId?: string | null;
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

    /** Sets or clears projectId. Pass null to unpin. */
    pinToProject(userId: string, extractionId: string, projectId: string | null): Promise<void>;

    /** Hard-deletes the artifact. */
    delete(userId: string, extractionId: string): Promise<void>;

    /**
     * Called when a session is deleted. Sets sessionId=null +
     * sourceSessionDeleted=true on every extraction whose sessionId
     * matches. Artifacts survive — only their origin link is severed.
     */
    orphanBySession(userId: string, sessionId: string): Promise<void>;

    /**
     * Called when a project is deleted. Sets projectId=null on every
     * extraction pinned to that project. Mirrors the pattern projects
     * already use for chat sessions.
     */
    orphanByProject(userId: string, projectId: string): Promise<void>;
}
