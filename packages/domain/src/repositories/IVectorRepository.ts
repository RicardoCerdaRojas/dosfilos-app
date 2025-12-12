import { DocumentChunkEntity, ChunkSearchResult } from '../entities/DocumentChunk';

/**
 * Filter options for vector search queries
 */
export interface VectorSearchFilter {
    userId: string;
    resourceIds?: string[];
}

/**
 * IVectorRepository - Interface for vector storage and search
 * Follows Repository pattern with vector-specific operations
 */
export interface IVectorRepository {
    /**
     * Upsert chunks with embeddings into vector store
     * @param chunks - Chunks with embeddings to store
     * @param onProgress - Optional callback for progress updates
     */
    upsert(
        chunks: DocumentChunkEntity[],
        onProgress?: (progress: number, stage: string) => void
    ): Promise<void>;

    /**
     * Search for similar vectors
     * @param embedding - Query embedding vector
     * @param topK - Number of results to return
     * @param filter - Filter by user/resource
     * @returns Chunks with similarity scores, sorted by relevance
     */
    search(
        embedding: number[],
        topK: number,
        filter: VectorSearchFilter
    ): Promise<ChunkSearchResult[]>;

    /**
     * Delete all chunks for a specific resource
     * @param resourceId - Resource ID to delete chunks for
     */
    deleteByResourceId(resourceId: string): Promise<void>;

    /**
     * Check if a resource has been indexed
     * @param resourceId - Resource ID to check
     */
    hasIndex(resourceId: string): Promise<boolean>;
}
