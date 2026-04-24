import { WorkflowPhase } from './SermonWorkflow';

export type ResourceType = 'theology' | 'grammar' | 'commentary' | 'article' | 'other';

export type TextExtractionStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Which extractor produced the text content.
 * - '3.0-llamaparse': Primary, best quality (structured pages, preserves Greek/Hebrew/tables)
 * - '2.0-gemini': Fallback, Gemini 2.0 Flash extraction
 * - 'fallback-pdfparse': Last resort, local pdf-parse library
 */
export type ExtractionVersion = '3.0-llamaparse' | '2.0-gemini' | 'fallback-pdfparse';

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
    mimeType: string;
    sizeBytes: number;
    characterCount?: number; // Total character count of extracted text
    pageCount?: number; // Total page count from extraction

    // 🎯 Core Library: Stores this document is included in (can be multiple)
    coreStores?: ('exegesis' | 'homiletics' | 'generic')[];

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
