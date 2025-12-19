import { LibraryResourceEntity, ResourceType } from '@dosfilos/domain';
import {
    FirebaseLibraryRepository,
    FirebaseStorageService,
    GeminiEmbeddingService,
    MemoryCacheService,
    FirestoreVectorRepository
} from '@dosfilos/infrastructure';
import { RAGService } from './RAGService';

/**
 * LibraryService
 * Manages user library resources and integrates with RAG for semantic search
 * 
 * Storage Structure: users/{userId}/library/{resourceId}/{filename}
 * Cloud Function automatically extracts text when PDF is uploaded
 */
export class LibraryService {
    private libraryRepository: FirebaseLibraryRepository;
    private storageService: FirebaseStorageService;
    private ragService: RAGService | null = null;

    constructor() {
        this.libraryRepository = new FirebaseLibraryRepository();
        this.storageService = new FirebaseStorageService();
    }

    /**
     * Lazy initialization of RAGService
     * Only created when needed to avoid API key issues on startup
     */
    private getRAGService(): RAGService | null {
        if (!this.ragService) {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (apiKey) {
                const embeddingService = new GeminiEmbeddingService(apiKey);
                const vectorRepository = new FirestoreVectorRepository();
                const cacheService = new MemoryCacheService();
                this.ragService = new RAGService(embeddingService, vectorRepository, cacheService);
            }
        }
        return this.ragService;
    }

    /**
     * Upload a resource to Firebase Storage and create Firestore document
     * Cloud Function will automatically extract text from PDF
     */
    async uploadResource(
        userId: string,
        file: File,
        metadata: { title: string; author: string; type: ResourceType },
        onProgress?: (percentage: number) => void
    ): Promise<LibraryResourceEntity> {
        // 1. Generate resource ID first
        const resourceId = crypto.randomUUID();

        // 2. Upload file to Firebase Storage: users/{userId}/library/{resourceId}/{filename}
        const storagePath = `users/${userId}/library/${resourceId}/${file.name}`;
        console.log(`📤 Uploading to: ${storagePath}`);

        const uploadedFile = await this.storageService.uploadFile(
            file,
            storagePath,
            { contentType: file.type },
            (progress) => {
                console.log(`Upload progress: ${progress.percentage.toFixed(0)}%`);
                onProgress?.(progress.percentage);
            }
        );

        // 3. Create resource entity with the storage URL
        const resource = new LibraryResourceEntity(
            resourceId,
            userId,
            metadata.title,
            metadata.author,
            metadata.type,
            uploadedFile.downloadUrl,
            file.type,
            file.size,
            undefined, // textExtractionStatus
            undefined, // textContent
            new Date(),
            new Date()
        );

        // 4. Save to Firestore
        await this.libraryRepository.create(resource);

        console.log(`✅ Resource ${resource.id} uploaded. Cloud Function will extract text.`);

        return resource;
    }

    /**
     * Index a resource for semantic search
     * Should be called after Cloud Function has extracted text
     * @param resource - The resource to index
     * @param onProgress - Optional callback for progress updates (0-100, stage name)
     */
    async indexResource(
        resource: LibraryResourceEntity,
        options: { force?: boolean; onProgress?: (progress: number, stage: string) => void } = {}
    ): Promise<number> {
        const rag = this.getRAGService();
        if (!rag) {
            console.warn('RAGService not available, skipping indexing');
            return 0;
        }

        // Refresh resource from Firestore to get latest textContent
        const freshResource = await this.libraryRepository.findById(resource.id);
        if (!freshResource) {
            console.warn(`Resource ${resource.id} not found`);
            throw new Error('TEXT_NOT_READY');
        }

        // Check if text extraction is ready
        if (freshResource.textExtractionStatus !== 'ready') {
            console.warn(`Resource ${resource.id} text extraction status: ${freshResource.textExtractionStatus}`);
            throw new Error('TEXT_NOT_READY');
        }

        // Get text content from Firestore (Gemini stores it there directly)
        const textContent = freshResource.textContent;
        if (!textContent || textContent.length < 100) {
            console.warn(`Resource ${resource.id} has no text content yet. Cloud Function may still be processing.`);
            throw new Error('TEXT_NOT_READY');
        }

        console.log(`📄 Indexing resource ${resource.id} with ${textContent.length} characters`);

        try {
            const chunksCreated = await rag.indexResource(freshResource, { force: options.force }, options.onProgress);
            console.log(`Indexed resource ${resource.id} with ${chunksCreated} chunks`);
            return chunksCreated;
        } catch (error) {
            console.error(`Error indexing resource ${resource.id}:`, error);
            return 0;
        }
    }

    /**
     * Index all resources for a user
     */
    async indexAllResources(userId: string): Promise<number> {
        const resources = await this.getUserResources(userId);
        let totalChunks = 0;

        for (const resource of resources) {
            if (resource.textContent && resource.textContent.length > 100) {
                const chunks = await this.indexResource(resource);
                totalChunks += chunks;
            }
        }

        return totalChunks;
    }

    /**
     * Search for relevant chunks across user's library
     */
    async searchLibrary(
        query: string,
        userId: string,
        resourceIds?: string[],
        topK: number = 10
    ) {
        const rag = this.getRAGService();
        if (!rag) {
            console.warn('RAGService not available');
            return [];
        }

        return rag.search(query, userId, resourceIds, topK);
    }

    /**
     * Check if a resource is indexed
     */
    async isResourceIndexed(resourceId: string): Promise<boolean> {
        const rag = this.getRAGService();
        if (!rag) {
            return false;
        }
        const result = await rag.isIndexed(resourceId);
        return result;
    }

    /**
     * Get a single resource by ID
     */
    async getResource(resourceId: string): Promise<LibraryResourceEntity | null> {
        return this.libraryRepository.findById(resourceId);
    }

    async getUserResources(userId: string): Promise<LibraryResourceEntity[]> {
        return this.libraryRepository.findByUserId(userId);
    }

    subscribeToUserResources(
        userId: string,
        callback: (resources: LibraryResourceEntity[]) => void,
        onError?: (error: Error) => void
    ): () => void {
        return this.libraryRepository.subscribeToUserResources(userId, callback, onError);
    }

    async deleteResource(id: string): Promise<void> {
        console.log(`🗑️ Starting delete for resource: ${id}`);

        // Delete from vector store first
        const rag = this.getRAGService();
        if (rag) {
            try {
                console.log(`🗑️ Deleting vector index...`);
                await rag.deleteIndex(id);
                console.log(`✅ Vector index deleted`);
            } catch (error) {
                console.error(`❌ Vector index delete failed:`, error);
                // Continue with resource delete even if vector fails
            }
        }

        console.log(`🗑️ Deleting from Firestore...`);
        await this.libraryRepository.delete(id);
        console.log(`✅ Resource deleted from Firestore`);
    }

    /**
     * Update resource metadata (title, author, type)
     */
    /**
     * Update resource metadata (title, author, type, core library status)
     */
    async updateResource(
        id: string,
        updates: {
            title?: string;
            author?: string;
            type?: ResourceType;
            metadata?: any;
            isCore?: boolean;
            coreContext?: 'exegesis' | 'homiletics' | 'generic';
        }
    ): Promise<void> {
        console.log(`📝 Updating resource ${id}:`, updates);
        await this.libraryRepository.update(id, {
            ...updates,
            updatedAt: new Date()
        });
        console.log(`✅ Resource ${id} updated`);
    }

    /**
     * Self-healing: Refresh Gemini links for expired 403/404 resources
     * Re-uses the robust server-side Cloud Function 'syncResourceToGemini'
     */
    async refreshGeminiLinks(resourceIds: string[]): Promise<void> {
        console.log(`🔄 Self-Healing: Refreshing Gemini links for ${resourceIds.length} resources via Server Function...`);

        // Dynamic import for Firebase Functions to avoid loading if not needed
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const syncFn = httpsCallable(functions, 'syncResourceToGemini');

        const promises = resourceIds.map(async (id) => {
            try {
                const resource = await this.getResource(id);
                if (!resource) return;

                console.log(`☁️ Calling syncResourceToGemini for: ${resource.title}...`);
                const result = await syncFn({ resourceId: id });
                const data = result.data as any;

                if (data.success) {
                    console.log(`✅ Resource ${id} healed via Cloud Function. New URI: ${data.geminiUri}`);
                } else {
                    console.error(`❌ Cloud Function failed for ${id}:`, data.error);
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error(`❌ Failed to heal resource ${id}:`, error);
                throw error;
            }
        });

        await Promise.all(promises);
    }
}

export const libraryService = new LibraryService();
