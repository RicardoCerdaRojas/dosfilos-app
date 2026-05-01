import {
    LibraryResourceEntity,
    ResourceType,
    type LibraryResource,
    type ResourceIndexStatus,
    type SourceType as ExegesisSourceType,
} from '@dosfilos/domain';
import {
    FirebaseLibraryRepository,
    FirebaseStorageService,
    GeminiEmbeddingService,
    MemoryCacheService,
    FirestoreVectorRepository
} from '@dosfilos/infrastructure';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { RAGService } from './RAGService';

/**
 * Generic shape returned by `getCoreStoresConfig` — keys + optional descriptions
 * for custom (admin-defined) stores. Decouples consumers from the underlying
 * Firestore document structure and from the strict 3-context typing of
 * `CoreLibraryStoresConfig`.
 */
export interface CoreStoresConfigSummary {
    /** Available store keys (e.g. ['exegesis', 'homiletics', 'generic', 'patristic']). */
    keys: string[];
    /** Optional human-readable description per key — typically used for custom (non-standard) stores. */
    descriptions: Record<string, string>;
}

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

    async getCoreResources(): Promise<LibraryResourceEntity[]> {
        return this.libraryRepository.findCoreResources();
    }

    /**
     * Combined readiness probe used by the v1.5 exegesis "extract from
     * library" UI. Mirrors the gating logic of the auto-index trigger
     * (`packages/functions/src/library/autoIndexOnExtractionReady.ts`)
     * so the badge the user sees matches what the trigger will (or
     * will not) do for each resource.
     *
     * Resolution order — first matching condition wins:
     *   1. extraction failed → 'failed'
     *   2. extraction in flight (pending/processing) → 'extracting'
     *   3. indexing failed → 'failed'
     *   4. indexing in flight → 'indexing'
     *   5. indexed at the current schema → 'indexed'
     *   6. extraction ready but extractor version not eligible for
     *      auto-index (e.g. legacy '2.0-gemini') → 'needs-indexing'
     *   7. anything else (typically resources without
     *      `textExtractionStatus` set yet) → 'needs-extraction'
     *
     * Note: the user CANNOT trigger reindexing themselves — the
     * `processWithGemini`/`reprocessWithLlamaParse` callables are
     * admin-only by design. Resources stuck on 'needs-indexing' /
     * 'failed' can still be used in `'full-document'` mode (the
     * orchestrator falls back to `textContent`); they just can't be
     * source of curated excerpts. The corpus picker disables the
     * "extract excerpts" toggle for those.
     */
    getResourceIndexStatus(resource: LibraryResource): ResourceIndexStatus {
        const INDEXER_VERSION_CURRENT = '2.0-structured';
        const AUTO_INDEX_EXTRACTORS: ReadonlyArray<string> = ['3.0-llamaparse', '4.0-gemini-standard'];

        if (resource.textExtractionStatus === 'failed') return 'failed';
        if (resource.textExtractionStatus === 'pending'
            || resource.textExtractionStatus === 'processing') return 'extracting';
        if (resource.indexingStatus === 'failed') return 'failed';
        if (resource.indexingStatus === 'processing') return 'indexing';
        if (resource.indexingStatus === 'ready'
            && resource.indexerVersion === INDEXER_VERSION_CURRENT) return 'indexed';
        if (resource.textExtractionStatus === 'ready'
            && resource.extractionVersion
            && !AUTO_INDEX_EXTRACTORS.includes(resource.extractionVersion)) return 'needs-indexing';
        return 'needs-extraction';
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
            /**
             * v1.5 commit 6: cache the exegesis-grade classification
             * the user picked the first time they extracted from this
             * resource. Pass `null` to explicitly clear (rare —
             * usually only when the user changes their mind in the
             * extraction dialog).
             */
            exegeticalType?: ExegesisSourceType | null;
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
     * @deprecated Legacy Gemini File Search URI refresh — now a no-op.
     * Phase 2 RAG uses Firestore vector search + Storage-triggered extraction,
     * so there are no expiring URIs to refresh. Kept as a stub so residual
     * callers (e.g. the legacy library-context sync routine) don't crash.
     */
    async refreshGeminiLinks(_resourceIds: string[]): Promise<void> {
        // Intentionally empty. Remove all callers in a follow-up cleanup.
    }

    /**
     * Read the Core Library stores configuration. Returns the available store
     * keys + optional descriptions per key (used for custom admin-defined stores).
     *
     * Falls back to the standard 3 keys (`exegesis`, `homiletics`, `generic`) if
     * the config document doesn't exist or fails to load.
     *
     * Used by UI components that need to render the list of stores a resource
     * can be assigned to (e.g. `ConfigureCoreStoresModal`). Keeps consumers
     * decoupled from Firestore internals.
     */
    async getCoreStoresConfig(): Promise<CoreStoresConfigSummary> {
        const FALLBACK_KEYS = ['exegesis', 'homiletics', 'generic'];
        try {
            const db = getFirestore();
            const snap = await getDoc(doc(db, 'config/coreLibraryStores'));
            if (!snap.exists()) {
                return { keys: FALLBACK_KEYS, descriptions: {} };
            }
            const data = snap.data();
            const stores = (data?.stores ?? {}) as Record<string, string | null>;
            const descriptions = (data?.descriptions ?? {}) as Record<string, string>;
            const keys = Object.keys(stores);
            return {
                keys: keys.length > 0 ? keys : FALLBACK_KEYS,
                descriptions,
            };
        } catch (error) {
            console.error('[LibraryService] Failed to load Core stores config:', error);
            return { keys: FALLBACK_KEYS, descriptions: {} };
        }
    }

    /**
     * Resolves a store key (e.g. `'exegesis'`, `'patristic'`) to its underlying
     * provider store ID. Returns `null` when the key is not configured or the
     * config document doesn't exist. Abstracts Firestore from UI consumers.
     */
    async resolveStoreId(storeKey: string): Promise<string | null> {
        try {
            const db = getFirestore();
            const snap = await getDoc(doc(db, 'config/coreLibraryStores'));
            if (!snap.exists()) return null;
            const stores = (snap.data()?.stores ?? {}) as Record<string, string | null>;
            return stores[storeKey] ?? null;
        } catch (error) {
            console.error('[LibraryService] Failed to resolve store id:', error);
            return null;
        }
    }
}

export const libraryService = new LibraryService();
