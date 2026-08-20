import { getFunctions, httpsCallable } from 'firebase/functions';
import { IEmbeddingService } from '@dosfilos/domain';

/**
 * GeminiEmbeddingService
 * Implementation of IEmbeddingService using Google's Gemini text-embedding-004 model
 * 
 * Following Strategy Pattern: can be swapped with other embedding providers
 * (e.g., OpenAI, Cohere, Vertex AI) by implementing the same interface
 */
export class GeminiEmbeddingService implements IEmbeddingService {
    private static readonly EMBEDDING_DIMENSION = 768; // text-embedding-004 produces 768-dim vectors
    private static readonly BATCH_SIZE = 10;

    /**
     * Sin apiKey: los embeddings salen por el callable `embedTexts`. Antes cada
     * chunk era una llamada del navegador a Google con la clave pública —
     * indexar un libro eran cientos, ninguna medida ni limitada.
     */
    constructor() {}

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
        const [embedding] = await this.generateEmbeddings([text]);
        if (!embedding) throw new Error('embedTexts no devolvió embedding');
        return embedding;
    }

    /**
     * Generate embeddings for multiple texts in batch
     * More efficient for processing many chunks
     */
    /**
     * El lote viaja al servidor y se resuelve allá en paralelo. Se sigue
     * troceando en grupos para no exceder el tope del callable ni armar
     * peticiones enormes al indexar libros completos.
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const callable = httpsCallable<
            { texts: string[]; dimension: number },
            { embeddings: number[][] }
        >(getFunctions(), 'embedTexts');

        const out: number[][] = [];
        for (let i = 0; i < texts.length; i += GeminiEmbeddingService.BATCH_SIZE) {
            const batch = texts
                .slice(i, i + GeminiEmbeddingService.BATCH_SIZE)
                // El truncado se conserva del original: el modelo tiene tope de
                // tokens y el servidor vuelve a recortar por si acaso.
                .map((t) => t.slice(0, 8000));
            const res = await callable({
                texts: batch,
                dimension: GeminiEmbeddingService.EMBEDDING_DIMENSION,
            });
            out.push(...(res.data?.embeddings ?? []));
        }
        return out;
    }
}
