import { GoogleGenerativeAI } from '@google/generative-ai';
import { IEmbeddingService } from '@dosfilos/domain';

/**
 * GeminiEmbeddingService
 * Implementation of IEmbeddingService using Google's Gemini text-embedding-004 model
 * 
 * Following Strategy Pattern: can be swapped with other embedding providers
 * (e.g., OpenAI, Cohere, Vertex AI) by implementing the same interface
 */
export class GeminiEmbeddingService implements IEmbeddingService {
    private genAI: GoogleGenerativeAI;
    private model;
    private static readonly EMBEDDING_DIMENSION = 768; // text-embedding-004 produces 768-dim vectors
    private static readonly BATCH_SIZE = 10;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is required for embeddings');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }

    /**
     * Get the dimension of embeddings produced by this service
     */
    getEmbeddingDimension(): number {
        return GeminiEmbeddingService.EMBEDDING_DIMENSION;
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            // Truncate text if too long (model has token limits)
            const truncatedText = text.slice(0, 8000);
            const result = await this.model.embedContent(truncatedText);
            return result.embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     * More efficient for processing many chunks
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += GeminiEmbeddingService.BATCH_SIZE) {
            const batch = texts.slice(i, i + GeminiEmbeddingService.BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            embeddings.push(...batchResults);

            // Small delay to avoid rate limiting
            if (i + GeminiEmbeddingService.BATCH_SIZE < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return embeddings;
    }
}
