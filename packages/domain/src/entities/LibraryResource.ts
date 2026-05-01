import { WorkflowPhase } from './SermonWorkflow';

export type ResourceType = 'theology' | 'grammar' | 'commentary' | 'article' | 'other';

export type TextExtractionStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Which extractor produced the text content.
 * - '3.0-llamaparse': Primary, best quality (structured pages, preserves Greek/Hebrew/tables)
 * - '4.0-gemini-standard': Standard tier, Gemini 2.0 Flash with the same `<!-- page: N -->`
 *   contract as LlamaParse — eligible for the auto-index trigger.
 * - '2.0-gemini': Legacy Gemini extraction, predates the structured contract.
 * - 'fallback-pdfparse': Last resort, local pdf-parse library.
 */
export type ExtractionVersion =
    | '3.0-llamaparse'
    | '4.0-gemini-standard'
    | '2.0-gemini'
    | 'fallback-pdfparse';

/**
 * Indexing job status (chunks + embeddings) written by the cloud
 * functions in `packages/functions/src/library/indexStructuredDocument.ts`.
 * Distinct from `textExtractionStatus` — a resource can be `ready`-extracted
 * but still `processing`/`failed` for indexing.
 */
export type IndexingStatus = 'processing' | 'ready' | 'failed';

/**
 * Combined readiness state for the v1.5 exegesis "extract from library"
 * flow. Computed by `LibraryService.getResourceIndexStatus()` from the
 * raw fields on the resource. Used by the corpus picker to badge each
 * library resource and gate the "extract excerpts" toggle.
 */
export type ResourceIndexStatus =
    | 'indexed'           // Ready to be queried via retrieveChunks (chunks + embeddings present)
    | 'extracting'        // Cloud Function is still parsing the file
    | 'indexing'          // Extraction done; auto-index trigger in flight
    | 'needs-extraction'  // No textExtractionStatus or 'pending' — never started
    | 'needs-indexing'    // Extraction ready but with a version that the indexer ignores (legacy)
    | 'failed';           // Either extraction or indexing reported failure

export interface LibraryResource {
    id: string;
    userId: string;
    title: string;
    author: string;
    type: ResourceType;
    storageUrl: string;
    textContent?: string | undefined; // Legacy: Extracted text directly (deprecated)
    textContentUrl?: string | undefined; // URL to text file in Cloud Storage
    structuredContentUrl?: string | undefined; // URL to structured Markdown (LlamaParse output)
    extractionVersion?: ExtractionVersion; // Which extractor produced textContent
    extractedWithLlamaParse?: boolean; // Convenience flag
    textExtractionStatus: TextExtractionStatus;
    /**
     * Indexing job status (chunks + embeddings) written by the
     * `indexStructuredDocument` cloud function. Undefined for legacy
     * resources that were never indexed. The auto-index trigger fires
     * after extraction completes and updates this field.
     */
    indexingStatus?: IndexingStatus;
    /**
     * Indexer schema version (e.g. '2.0-structured'). Used by the
     * auto-index trigger to detect already-indexed resources and skip
     * re-work. Also used by the readiness probe to flag resources
     * indexed under an older schema.
     */
    indexerVersion?: string;
    mimeType: string;
    sizeBytes: number;
    characterCount?: number; // Total character count of extracted text
    pageCount?: number; // Total page count from extraction

    // 🎯 Core Library: Stores this document is included in (can be multiple)
    coreStores?: ('exegesis' | 'homiletics' | 'generic')[];

    /**
     * Whether this document's citations may be shown to non-admin users.
     * When false (default), the document is still used for RAG retrieval (admin sees
     * citations + bibliography) but non-admin users see responses with citations stripped.
     * Flip to true ONLY for public-domain / openly-licensed material (Calvino, Spurgeon,
     * Patrística, Gesenius, etc.) or material with an explicit signed license.
     */
    publiclyCitable?: boolean;

    // Phase preference: documents preferred for specific workflow phases
    preferredForPhases?: WorkflowPhase[];

    // Extensible metadata (e.g. for Gemini File URIs)
    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}

export class LibraryResourceEntity implements LibraryResource {
    public preferredForPhases?: WorkflowPhase[];
    public metadata?: Record<string, any>;
    public coreStores?: ('exegesis' | 'homiletics' | 'generic')[];

    constructor(
        public id: string,
        public userId: string,
        public title: string,
        public author: string,
        public type: ResourceType,
        public storageUrl: string,
        public mimeType: string,
        public sizeBytes: number,
        public textExtractionStatus: TextExtractionStatus = 'pending',
        public textContent?: string,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        preferredForPhases?: WorkflowPhase[],
        metadata?: Record<string, any>,
        public pageCount?: number,
        coreStores?: ('exegesis' | 'homiletics' | 'generic')[]
    ) {
        if (preferredForPhases) {
            this.preferredForPhases = preferredForPhases;
        }
        if (metadata) {
            this.metadata = metadata;
        }
        if (coreStores) {
            this.coreStores = coreStores;
        }
        this.validate();
    }

    private validate(): void {
        if (!this.title || this.title.trim().length < 3) {
            throw new Error('El título del recurso debe tener al menos 3 caracteres');
        }
        if (!this.storageUrl) {
            throw new Error('El recurso debe tener una URL de almacenamiento');
        }
    }

    static create(
        data: Omit<LibraryResource, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): LibraryResourceEntity {
        return new LibraryResourceEntity(
            data.id ?? crypto.randomUUID(),
            data.userId,
            data.title,
            data.author,
            data.type,
            data.storageUrl,
            data.mimeType,
            data.sizeBytes,
            data.textExtractionStatus,
            data.textContent,
            new Date(),
            new Date(),
            data.preferredForPhases,
            data.metadata,
            data.pageCount
        );
    }
}
