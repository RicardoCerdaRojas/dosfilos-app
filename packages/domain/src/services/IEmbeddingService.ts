/**
 * IEmbeddingService - Interface for embedding generation
 * Follows Strategy pattern: swap implementations without changing consumers
 */
export interface IEmbeddingService {
    /**
     * Generate embedding vector for a single text
     * @param text - Input text to embed
     * @returns Embedding vector (dimension depends on implementation)
     */
    generateEmbedding(text: string): Promise<number[]>;

    /**
     * Generate embeddings for multiple texts (batch processing)
     * @param texts - Array of texts to embed
     * @returns Array of embedding vectors
     */
    generateEmbeddings(texts: string[]): Promise<number[][]>;

    /**
     * Get the dimension of embeddings produced by this service
     */
    getEmbeddingDimension(): number;
}
