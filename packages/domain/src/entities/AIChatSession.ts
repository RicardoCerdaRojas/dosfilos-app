import { SourceReference, ConcreteResponseMode } from '../services/IAIGeneratorService';

export type MessageRole = 'user' | 'model' | 'system';

export interface AIChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    sources?: SourceReference[];
    /** Concrete response mode used by the model when generating this message. */
    modeUsed?: ConcreteResponseMode;
    /** True when `modeUsed` was auto-inferred by the router (user picked 'auto'). */
    modeWasAuto?: boolean;
    /**
     * MVP multimodal: metadata of files the user attached when sending
     * this message. The binary is NOT persisted — only enough to show
     * "user shared photo.jpg" in the bubble after reload. The image
     * itself travels inline to Gemini for the single exchange and is
     * discarded thereafter.
     */
    attachments?: MessageAttachmentMeta[];
}

/**
 * Metadata for a file the user attached to a chat message. The binary
 * itself is NOT persisted in the MVP — it travels to the model as an
 * inline part of the request and then the request is discarded. We keep
 * just enough info to render a small "📎 photo.jpg · 2.4 MB" badge on
 * the user bubble after the exchange is saved.
 */
export interface MessageAttachmentMeta {
    /** Original filename, used as the badge label. */
    filename: string;
    /** MIME type — used for the icon and to validate against allowed types. */
    mimeType: string;
    /** Size in bytes; rendered as "X.X MB" / "X KB" in the badge. */
    sizeBytes: number;
}

/**
 * Inline-encoded attachment used when CALLING the model. Carries the
 * actual bytes (base64) plus the mime type Gemini needs. Never stored.
 */
export interface InlineAttachment {
    mimeType: string;
    /** Base64-encoded bytes (no data: URI prefix). */
    data: string;
}

export interface AIChatSession {
    id: string;
    userId: string;
    agentId: string;
    title: string;
    projectId?: string;   // Optional: links session to an AIProject
    createdAt: Date;
    updatedAt: Date;
    messages: AIChatMessage[];
    /**
     * Optional structured context the user opened the session FROM
     * (e.g. clicked "Preguntar a Faculty" while reading an exegetical
     * paper). Each ref is consumed by the orchestrator to enrich the
     * system prompt with passage / phase / pericope justification —
     * NOT to inline the full paper markdown (that would balloon the
     * token bill on every turn for questions that may not need it;
     * the assembled paper rides RAG when the model actually queries
     * the corpus).
     *
     * Grouped under `context` instead of flat fields so future refs
     * (chapter, sermon draft, library resource) extend the shape
     * without polluting the entity surface.
     */
    context?: AIChatSessionContext;
}

/**
 * Refs the session was launched from. All optional and additive — a
 * session may have just `paperId`, or both `seriesId + pericopeId`,
 * etc. The orchestrator hydrates each ref it sees and assembles a
 * compact context block for the system prompt. Refs that no longer
 * resolve (paper deleted, pericope removed) are silently skipped —
 * the chat keeps working with a slightly weaker prompt.
 */
export interface AIChatSessionContext {
    /** ExegeticalPaper.id — paper the user was reading when they opened chat. */
    paperId?: string;
    /** SermonSeries.id — series detail page the user opened chat from. */
    seriesId?: string;
    /**
     * `PlannedSermon.id` within `seriesId` — when set, the orchestrator
     * pulls the syntactic unit's passage + justification into the
     * prompt so the chat is anchored on that specific pericope.
     * Requires `seriesId` to be set; ignored otherwise.
     */
    pericopeId?: string;
}

