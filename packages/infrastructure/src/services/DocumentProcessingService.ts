import { LibraryResourceEntity, DocumentChunkEntity } from '@dosfilos/domain';
import { GeminiEmbeddingService } from '../gemini/GeminiEmbeddingService';
import { FirebaseChunkRepository } from '../firebase/FirebaseChunkRepository';

interface ChunkingOptions {
    chunkSize?: number;      // Target size in characters (default: 800)
    chunkOverlap?: number;   // Overlap between chunks (default: 100)
    minChunkSize?: number;   // Minimum chunk size (default: 200)
}

/**
 * DocumentProcessingService
 * Handles chunking documents and generating embeddings for semantic search
 */
export class DocumentProcessingService {
    private embeddingService: GeminiEmbeddingService;
    private chunkRepository: FirebaseChunkRepository;

    constructor(apiKey: string) {
        this.embeddingService = new GeminiEmbeddingService(apiKey);
        this.chunkRepository = new FirebaseChunkRepository();
    }

    /**
     * Process a library resource: chunk text and generate embeddings
     */
    async processResource(
        resource: LibraryResourceEntity,
        options: ChunkingOptions = {}
    ): Promise<DocumentChunkEntity[]> {
        if (!resource.textContent) {
            console.warn(`Resource ${resource.id} has no text content to process`);
            return [];
        }

        // Check if already processed
        const existingChunks = await this.chunkRepository.findByResourceId(resource.id);
        if (existingChunks.length > 0) {
            console.log(`Resource ${resource.id} already has ${existingChunks.length} chunks`);
            return existingChunks;
        }

        console.log(`Processing resource: ${resource.title} by ${resource.author}`);

        // 1. Split text into chunks
        const textChunks = this.chunkText(resource.textContent, options);
        console.log(`Created ${textChunks.length} chunks`);

        // 2. Create chunk entities
        const chunks = textChunks.map((textData, index) =>
            DocumentChunkEntity.create({
                resourceId: resource.id,
                resourceTitle: resource.title,
                resourceAuthor: resource.author,
                userId: resource.userId,
                chunkIndex: index,
                text: textData.text,
                embedding: undefined, // Will be filled below
                metadata: {
                    startChar: textData.startChar,
                    endChar: textData.endChar,
                    page: this.extractPageNumber(textData.text, textData.startChar, resource.textContent || ''),
                    section: this.extractSection(textData.text)
                }
            })
        );

        // 3. Generate embeddings (in batches to avoid rate limits)
        console.log('Generating embeddings...');
        const texts = chunks.map(c => c.text);
        const embeddings = await this.embeddingService.generateEmbeddings(texts);

        // 4. Assign embeddings to chunks
        for (let i = 0; i < chunks.length; i++) {
            chunks[i].embedding = embeddings[i];
        }

        // 5. Save to Firestore
        console.log('Saving chunks to Firestore...');
        await this.chunkRepository.createBatch(chunks);

        console.log(`Successfully processed ${chunks.length} chunks for ${resource.title}`);
        return chunks;
    }

    /**
     * Process multiple resources
     */
    async processResources(resources: LibraryResourceEntity[]): Promise<Map<string, DocumentChunkEntity[]>> {
        const results = new Map<string, DocumentChunkEntity[]>();

        for (const resource of resources) {
            try {
                const chunks = await this.processResource(resource);
                results.set(resource.id, chunks);
            } catch (error) {
                console.error(`Error processing resource ${resource.id}:`, error);
                results.set(resource.id, []);
            }
        }

        return results;
    }

    /**
     * Get chunks for semantic search based on selected resource IDs
     */
    async getChunksForResources(resourceIds: string[]): Promise<DocumentChunkEntity[]> {
        return this.chunkRepository.findByResourceIds(resourceIds);
    }

    /**
     * Search for relevant chunks across resources using semantic similarity
     */
    async searchRelevantChunks(
        query: string,
        resourceIds: string[],
        topK: number = 10
    ): Promise<{ chunk: DocumentChunkEntity; score: number }[]> {
        // 1. Get all chunks for the specified resources
        const chunks = await this.getChunksForResources(resourceIds);

        if (chunks.length === 0) {
            console.log('No chunks found for search');
            return [];
        }

        // 2. Generate embedding for the query
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);

        // 3. Calculate cosine similarity for each chunk
        const allResults = chunks
            .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
            .map(chunk => ({
                chunk,
                score: DocumentChunkEntity.cosineSimilarity(queryEmbedding, chunk.embedding!)
            }))
            .sort((a, b) => b.score - a.score);

        // Debug: Log resource distribution and top scores BEFORE filtering
        const resourceScores = new Map<string, { maxScore: number; count: number; resourceId: string }>();
        allResults.forEach(r => {
            const title = r.chunk.resourceTitle || 'Unknown';
            const existing = resourceScores.get(title);
            if (!existing || r.score > existing.maxScore) {
                resourceScores.set(title, {
                    maxScore: r.score,
                    count: (existing?.count || 0) + 1,
                    resourceId: r.chunk.resourceId
                });
            } else {
                resourceScores.set(title, { ...existing, count: existing.count + 1 });
            }
        });
        console.log(`📊 [RAG DEBUG] Resource distribution (${allResults.length} total chunks):`);
        Array.from(resourceScores.entries())
            .sort((a, b) => b[1].maxScore - a[1].maxScore)
            .forEach(([title, { maxScore, count }]) => {
                const status = maxScore >= 0.55 ? '✅' : '❌';
                console.log(`   ${status} ${title}: max=${maxScore.toFixed(4)}, chunks=${count}`);
            });

        console.log(`🔍 [DEBUG] Top 5 scores (before threshold):`,
            allResults.slice(0, 5).map(r => `${r.score.toFixed(4)}: ${r.chunk.text.substring(0, 50)}...`));

        // Filter by threshold
        const results = allResults
            .filter(result => result.score >= 0.55) // Lowered threshold to 0.55
            .slice(0, topK);

        // Log scores for debugging
        if (results.length > 0) {
            console.log(`✅ Found ${results.length} relevant chunks (threshold >= 0.55). Top scores:`,
                results.slice(0, 3).map(r => `${r.score.toFixed(3)}: ${r.chunk.text.substring(0, 40)}...`));
        } else {
            console.log('❌ No chunks found with score >= 0.55');
        }
        return results;
    }

    /**
     * Split text into overlapping chunks
     */
    private chunkText(
        text: string,
        options: ChunkingOptions = {}
    ): { text: string; startChar: number; endChar: number }[] {
        const {
            chunkSize = 800,
            chunkOverlap = 100,
            minChunkSize = 200
        } = options;

        const chunks: { text: string; startChar: number; endChar: number }[] = [];

        // Clean text
        const cleanText = text.replace(/\s+/g, ' ').trim();

        if (cleanText.length < minChunkSize) {
            return [{ text: cleanText, startChar: 0, endChar: cleanText.length }];
        }

        let startIndex = 0;

        while (startIndex < cleanText.length) {
            // Find end index for this chunk
            let endIndex = Math.min(startIndex + chunkSize, cleanText.length);

            // Try to end at a sentence boundary
            if (endIndex < cleanText.length) {
                const searchStart = Math.max(startIndex + minChunkSize, endIndex - 100);
                const searchEnd = endIndex + 50;
                const searchText = cleanText.substring(searchStart, Math.min(searchEnd, cleanText.length));

                // Look for sentence endings
                const sentenceEnd = this.findSentenceEnd(searchText);
                if (sentenceEnd > 0) {
                    endIndex = searchStart + sentenceEnd;
                }
            }

            const chunkText = cleanText.substring(startIndex, endIndex).trim();

            if (chunkText.length >= minChunkSize) {
                chunks.push({
                    text: chunkText,
                    startChar: startIndex,
                    endChar: endIndex
                });
            }

            // Move start with overlap
            startIndex = endIndex - chunkOverlap;

            // Ensure progress
            if (startIndex <= (chunks[chunks.length - 1]?.startChar || -1)) {
                startIndex = endIndex;
            }
        }

        return chunks;
    }

    /**
     * Find sentence ending position in text
     */
    private findSentenceEnd(text: string): number {
        // Look for . ! ? followed by space or end
        const patterns = [/[.!?]\s+[A-Z]/g, /[.!?]$/g];

        for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match) {
                return match.index + 1;
            }
        }

        return -1;
    }

    /**
     * Extract real page number from Gemini's [PAGE X] markers in the text
     * Falls back to character-based estimation if markers not found
     */
    private extractPageNumber(text: string, startChar: number, fullText: string): number {
        // First, try to find the most recent [PAGE X] marker before this chunk's position
        const textBeforeChunk = fullText.substring(0, startChar);
        const pageMarkers = [...textBeforeChunk.matchAll(/\[PAGE (\d+)\]/g)];

        if (pageMarkers.length > 0) {
            // Use the last page marker found before this chunk
            const lastMarker = pageMarkers[pageMarkers.length - 1];
            return parseInt(lastMarker[1] || '1', 10);
        }

        // Also check if chunk itself starts with a page marker
        const chunkPageMatch = text.match(/^\[PAGE (\d+)\]/);
        if (chunkPageMatch) {
            return parseInt(chunkPageMatch[1], 10);
        }

        // Fallback: estimate based on character position
        return this.estimatePage(startChar);
    }

    /**
     * Estimate page number based on character position
     * Assumes ~1800 characters per page (adjusted for typical PDF extraction)
     * Note: This is a fallback - real page numbers come from Gemini markers
     */
    private estimatePage(startChar: number): number {
        return Math.floor(startChar / 1800) + 1;
    }

    /**
     * Extract section/chapter title if present at start of chunk
     */
    private extractSection(text: string): string | undefined {
        // Look for chapter/section patterns at start
        const patterns = [
            /^(Capítulo|Chapter|Sección|Section)\s+\d+[:.]/i,
            /^([IVX]+\.?\s+)/,  // Roman numerals
            /^(\d+\.?\s+[A-Z])/,  // Numbered sections
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                // Get first line as section title
                const firstLine = text.split('\n')[0]?.substring(0, 100);
                return firstLine;
            }
        }

        return undefined;
    }

    /**
     * Delete all chunks for a resource (when resource is deleted or reprocessed)
     */
    async deleteChunksForResource(resourceId: string): Promise<void> {
        await this.chunkRepository.deleteByResourceId(resourceId);
    }
}
