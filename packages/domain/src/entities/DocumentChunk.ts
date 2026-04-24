/**
 * DocumentChunk Entity
 * Represents a fragment of a library document for semantic search
 */

export interface DocumentChunkData {
    id: string;
    resourceId: string;           // Reference to LibraryResource
    resourceTitle: string;        // "Gramática Griega"
    resourceAuthor: string;       // "Daniel B. Wallace"
    userId: string;               // Owner of the resource
    chunkIndex: number;           // Position in document (0, 1, 2...)
    text: string;                 // Actual text content (~500-2000 chars)
    embedding?: number[];         // Vector embedding from Gemini (optional)
    metadata: {
        page?: number;            // Real page number from LlamaParse extraction
        section?: string;         // Deepest heading (e.g. "1.2 El aoristo")
        sectionPath?: string[];   // Full breadcrumb: ["Parte III", "Cap 11", "El aoristo"]
        chunkType?: 'narrative' | 'table' | 'list' | 'heading-only';
        startChar?: number;       // Character offset in original
        endChar?: number;
    };
    stores?: string[];            // Core Library stores this chunk belongs to (scoping for RAG)
    indexerVersion?: string;      // '1.0-legacy' | '2.0-structured' (LlamaParse-aware)
    createdAt: Date;
}

export class DocumentChunkEntity implements DocumentChunkData {
    public embedding?: number[];
    public stores?: string[];
    public indexerVersion?: string;

    constructor(
        public id: string,
        public resourceId: string,
        public resourceTitle: string,
        public resourceAuthor: string,
        public userId: string,
        public chunkIndex: number,
        public text: string,
        embedding: number[] | undefined,
        public metadata: DocumentChunkData['metadata'],
        public createdAt: Date = new Date(),
        stores?: string[],
        indexerVersion?: string,
    ) {
        this.embedding = embedding;
        this.stores = stores;
        this.indexerVersion = indexerVersion;
    }

    static create(data: Omit<DocumentChunkData, 'id' | 'createdAt'> & { id?: string }): DocumentChunkEntity {
        return new DocumentChunkEntity(
            data.id ?? crypto.randomUUID(),
            data.resourceId,
            data.resourceTitle,
            data.resourceAuthor,
            data.userId,
            data.chunkIndex,
            data.text,
            data.embedding,
            data.metadata,
            new Date(),
            data.stores,
            data.indexerVersion,
        );
    }

    /**
     * Get a formatted citation string for this chunk. Uses the deepest section + page.
     */
    getCitation(): string {
        const pageInfo = this.metadata.page ? `, p. ${this.metadata.page}` : '';
        const sectionInfo = this.metadata.section ? ` — ${this.metadata.section}` : '';
        return `${this.resourceAuthor}, "${this.resourceTitle}"${sectionInfo}${pageInfo}`;
    }

    /**
     * Section breadcrumb as a string, useful for prompts.
     */
    getSectionBreadcrumb(): string {
        if (this.metadata.sectionPath && this.metadata.sectionPath.length > 0) {
            return this.metadata.sectionPath.join(' › ');
        }
        return this.metadata.section ?? '';
    }

    /**
     * Calculate cosine similarity with another embedding
     */
    static cosineSimilarity(a: number[] | undefined, b: number[] | undefined): number {
        if (!a || !b || a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            const aVal = a[i] ?? 0;
            const bVal = b[i] ?? 0;
            dotProduct += aVal * bVal;
            normA += aVal * aVal;
            normB += bVal * bVal;
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
}

/**
 * Citation - A verified reference from the user's library
 */
export interface Citation {
    id: string;
    text: string;               // The cited phrase/idea
    sourceType: 'library' | 'general';  // Library = verified, General = AI knowledge
    resourceId?: string;        // Link to library resource (if library source)
    resourceTitle?: string;
    resourceAuthor?: string;
    chunkId?: string;           // Specific chunk reference
    page?: number;
    section?: string;
}

/**
 * SearchResult - A chunk with its similarity score
 */
export interface ChunkSearchResult {
    chunk: DocumentChunkEntity;
    score: number;              // Cosine similarity score (0-1)
}
