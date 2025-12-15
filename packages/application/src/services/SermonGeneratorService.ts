import { ISermonGenerator, ExegeticalStudy, HomileticalAnalysis, GenerationRules, SermonContent, PhaseDocument, LibraryResourceEntity } from '@dosfilos/domain';
import { GeminiSermonGenerator, DocumentProcessingService, GeminiFileSearchService } from '@dosfilos/infrastructure';
import { libraryService } from './LibraryService';

import { PhaseConfiguration } from '@dosfilos/domain';
import { FirebaseStorageService } from '@dosfilos/infrastructure';

// Extended config that includes library document IDs
export interface ExtendedPhaseConfiguration extends PhaseConfiguration {
    libraryDocIds?: string[];
    cacheName?: string;
    cachedResources?: Array<{ title: string; author: string }>;
    geminiUris?: string[]; // 🎯 NEW: Direct URIs fallback
}

// Context for RAG search
export interface RAGContext {
    query: string;  // The text to search for (e.g., passage or topic)
    userId: string;
}

export class SermonGeneratorService {
    private generator: ISermonGenerator;
    private storageService: FirebaseStorageService;
    private documentProcessor: DocumentProcessingService | null = null;
    private geminiFileSearch: GeminiFileSearchService | null = null;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('Gemini API key not configured. Generator features will be disabled.');
        }
        this.generator = new GeminiSermonGenerator(apiKey || '');
        this.storageService = new FirebaseStorageService();

        // Initialize services
        if (apiKey) {
            this.documentProcessor = new DocumentProcessingService(apiKey);
            // Don't instantiate geminiFileSearch here - it uses server-side APIs
            // this.geminiFileSearch = new GeminiFileSearchService(apiKey);
        }
    }

    /**
     * Fetch relevant chunks from library documents using RAG
     */
    private async fetchRAGContext(
        libraryDocIds: string[],
        searchQuery: string,
        topK: number = 5
    ): Promise<PhaseDocument[]> {
        if (!this.documentProcessor || libraryDocIds.length === 0) {
            return [];
        }

        try {
            console.log(`📚 [RAG] Searching ${libraryDocIds.length} library documents for: "${searchQuery.substring(0, 50)}..."`);

            const results = await this.documentProcessor.searchRelevantChunks(
                searchQuery,
                libraryDocIds,
                topK
            );

            if (results.length === 0) {
                console.log('📚 [RAG] No relevant chunks found');
                return [];
            }

            console.log(`✅ [RAG] Found ${results.length} relevant chunks`);

            // Convert chunks to PhaseDocument format
            return results.map((result, index) => ({
                id: `rag-${index}`,
                name: `${result.chunk.resourceTitle} (p.${result.chunk.metadata.page || '?'})`,
                content: result.chunk.text,
                type: 'rag-chunk'
            }));
        } catch (error) {
            console.error('❌ [RAG] Error fetching context:', error);
            return [];
        }
    }
    /**
     * Public method to manually refresh the Gemini Context Cache
     * @param config - Phase configuration with libraryDocIds
     * @param preloadedResources - Optional: Already loaded resources to avoid re-fetching from Firestore
     */
    async refreshContext(
        config: ExtendedPhaseConfiguration,
        preloadedResources?: LibraryResourceEntity[]
    ): Promise<{ cacheName?: string; cacheExpireTime?: Date; remainingDocIds: string[]; cachedResources?: Array<{ title: string; author: string }>; geminiUris?: string[] }> {
        return this.prepareGeminiContext(config, true, preloadedResources);
    }

    /**
     * Prepare Gemini Context Cache for AI Ready resources
     * Returns the cache name (if created) and the list of remaining doc IDs for RAG
     * @param preloadedResources - If provided, use these instead of fetching from Firestore
     */
    private async prepareGeminiContext(
        config: ExtendedPhaseConfiguration,
        retry: boolean = true, // 🎯 NEW: Retry flag for self-healing
        preloadedResources?: LibraryResourceEntity[]
    ): Promise<{ cacheName?: string; cacheExpireTime?: Date; remainingDocIds: string[]; cachedResources?: Array<{ title: string; author: string }>; geminiUris?: string[] }> {
        if (!this.geminiFileSearch || !config.libraryDocIds || config.libraryDocIds.length === 0) {
            return { remainingDocIds: config.libraryDocIds || [] };
        }

        try {
            // 1. Use preloaded resources OR fetch from Firestore
            let resources: (LibraryResourceEntity | null)[];

            if (preloadedResources && preloadedResources.length > 0) {
                console.log('🔍 prepareGeminiContext: Using PRELOADED resources');
                // Filter to only include resources that match the libraryDocIds
                resources = config.libraryDocIds.map(id =>
                    preloadedResources.find(r => r.id === id) || null
                );
            } else {
                console.log('🔍 prepareGeminiContext: Fetching resources from Firestore...');
                resources = await Promise.all(
                    config.libraryDocIds.map(id => libraryService.getResource(id).catch(() => null))
                );
            }

            // 🔍 DEBUG: Log what we got
            console.log('🔍 prepareGeminiContext: Resources:',
                resources.map(r => r ? {
                    id: r.id,
                    title: r.title?.substring(0, 30),
                    geminiUri: r.metadata?.geminiUri?.substring(0, 50) || 'NOT FOUND'
                } : 'NULL')
            );

            // 2. Identify AI Ready resources (those with geminiUri)
            const aiReadyResources = resources.filter(r => r && r.metadata?.geminiUri);
            console.log('🔍 prepareGeminiContext: AI Ready resources count:', aiReadyResources.length);
            const geminiUris = aiReadyResources.map(r => r!.metadata!.geminiUri);

            let cacheName: string | undefined;
            let cacheExpireTime: Date | undefined;

            // 3. Create Cache if we have AI Ready resources
            if (geminiUris.length > 0) {
                // Create a cache with 1 hour TTL (3600 seconds)
                const cacheResult = await this.geminiFileSearch.createCache(geminiUris, 3600);
                cacheName = cacheResult.name;
                cacheExpireTime = cacheResult.expireTime;
            }

            // 4. Filter out cached resources from RAG list to avoid redundancy
            // If cache creation was successful, we don't need to RAG these docs
            const cachedIds = aiReadyResources.map(r => r!.id);
            const remainingDocIds = config.libraryDocIds.filter(id => !cachedIds.includes(id));

            const cachedResources = aiReadyResources.map(r => ({
                title: r!.title,
                author: r!.author
            }));

            return { cacheName, cacheExpireTime, remainingDocIds, cachedResources, geminiUris }; // 🎯 NEW: Return cacheExpireTime

        } catch (error: any) {
            // Handle specific Gemini limits and permission errors gracefully
            if (error.toString().includes('403') || error.toString().includes('404')) {
                // 🎯 SELF-HEALING: Files expired or permissions lost
                if (retry) {
                    console.warn('⚠️ Gemini Cache expired (403/404). Attempting SELF-HEALING...');
                    try {
                        const failedIds = config.libraryDocIds;
                        await libraryService.refreshGeminiLinks(failedIds);
                        console.log('🔄 Self-healing complete. Retrying cache creation...');

                        // Recursive retry (only once)
                        return this.prepareGeminiContext(config, false);
                    } catch (healingError) {
                        console.error('❌ Self-healing failed:', healingError);
                    }
                } else {
                    console.warn('⚠️ Self-healing failed or max retries reached. Falling back to RAG.');
                }
            } else if (error.message?.includes('exceeds the supported page limit') || error.toString().includes('400')) {
                console.warn('⚠️ Gemini Cache limit exceeded. Falling back to standard RAG search.', error.message);
            } else {
                console.error('❌ Error preparing Gemini Context:', error);
            }

            console.warn('⚠️ Gemini Cache creation failed. Falling back to Direct File Usage (Multimodal RAG).');

            // 🎯 CRITICAL FALLBACK:
            // If cache failed but files might be valid (or healed),
            // we should try to return the resources anyway so the generator uses the URIs directly.
            // We re-fetch resources to get the potentially healed URIs.
            try {
                const resources = await Promise.all(
                    config.libraryDocIds.map(id => libraryService.getResource(id).catch(() => null))
                );
                const aiReadyResources = resources.filter(r => r && r.metadata?.geminiUri);

                if (aiReadyResources.length > 0) {
                    const geminiUris = aiReadyResources.map(r => r!.metadata!.geminiUri!);
                    const cachedResources = aiReadyResources.map(r => ({ title: r!.title, author: r!.author }));

                    // We return the URIs but NO cacheName. The generator will handle this.
                    return { remainingDocIds: [], cachedResources, geminiUris };
                }
            } catch (e) {
                console.error('Error fetching fallback resources:', e);
            }

            // Ultimate Fallback: Return original list for Standard RAG (Chunks)
            return { remainingDocIds: config.libraryDocIds, cachedResources: [] };
        }
    }

    /**
     * Hydrate config with legacy document content + RAG context
     */
    private async hydrateConfig(
        config: ExtendedPhaseConfiguration,
        ragContext?: RAGContext,
        overrideLibraryDocIds?: string[], // Use this to pass the filtered list (non-cached docs)
        cachedResources?: Array<{ title: string; author: string }>
    ): Promise<PhaseConfiguration> {
        // 1. Hydrate legacy documents (from storage)
        const hydratedLegacyDocs = await Promise.all(config.documents.map(async (doc) => {
            if (doc.storagePath) {
                try {
                    const content = await this.storageService.downloadFile(doc.storagePath);
                    const text = await content.text();
                    return { ...doc, content: text };
                } catch (error) {
                    console.error(`Failed to download document ${doc.name}:`, error);
                    return doc;
                }
            }
            return doc;
        }));

        // 2. Fetch RAG context from library documents
        // Use overrideLibraryDocIds if provided (these are the ones NOT in Gemini Cache)
        const docIdsToSearch = overrideLibraryDocIds !== undefined ? overrideLibraryDocIds : config.libraryDocIds;

        let ragDocuments: PhaseDocument[] = [];
        if (docIdsToSearch && docIdsToSearch.length > 0 && ragContext) {
            ragDocuments = await this.fetchRAGContext(
                docIdsToSearch,
                ragContext.query,
                5 // Top 5 relevant chunks
            );
        }

        // 3. Combine all documents (RAG chunks first for priority)
        return {
            ...config,
            documents: [...ragDocuments, ...hydratedLegacyDocs],
            cachedResources // Pass this through to the config
        };
    }

    async generateExegesis(
        passage: string,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ exegesis: ExegeticalStudy; cacheName?: string }> {
        let cacheName: string | undefined;
        let remainingDocIds: string[] | undefined;
        let geminiUris: string[] | undefined;
        let cachedResources: Array<{ title: string; author: string }> | undefined;

        if (config && userId) {
            const contextResult = await this.prepareGeminiContext(config);
            cacheName = contextResult.cacheName;
            remainingDocIds = contextResult.remainingDocIds;
            cachedResources = contextResult.cachedResources;
            geminiUris = contextResult.geminiUris;
        }

        const ragContext = userId ? { query: passage, userId } : undefined;
        // Pass remainingDocIds to hydrateConfig to avoid RAG on cached docs
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext, remainingDocIds, cachedResources) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        // Inject cacheName into config for the generator
        const finalConfig = hydratedConfig ? { ...hydratedConfig, cacheName, geminiUris } : { ...defaultConfig, cacheName, geminiUris };

        const exegesis = await this.generator.generateExegesis(passage, rules, finalConfig);
        return { exegesis, cacheName };
    }

    async generateHomiletics(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ homiletics: HomileticalAnalysis; cacheName?: string }> {
        let cacheName: string | undefined;
        let remainingDocIds: string[] | undefined;
        let geminiUris: string[] | undefined;
        let cachedResources: Array<{ title: string; author: string }> | undefined;

        if (config && userId) {
            const contextResult = await this.prepareGeminiContext(config);
            cacheName = contextResult.cacheName;
            remainingDocIds = contextResult.remainingDocIds;
            cachedResources = contextResult.cachedResources;
            geminiUris = contextResult.geminiUris;
        }

        // Use passage + proposition as search query for better relevance
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition}`;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext, remainingDocIds, cachedResources) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        const finalConfig = hydratedConfig ? { ...hydratedConfig, cacheName, geminiUris } : { ...defaultConfig, cacheName, geminiUris };

        const homiletics = await this.generator.generateHomiletics(exegesis, rules, finalConfig);
        return { homiletics, cacheName };
    }

    async generateSermonDraft(
        analysis: HomileticalAnalysis,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ draft: SermonContent; cacheName?: string }> {
        let cacheName: string | undefined;
        let remainingDocIds: string[] | undefined;
        let geminiUris: string[] | undefined;
        let cachedResources: Array<{ title: string; author: string }> | undefined;

        if (config && userId) {
            const contextResult = await this.prepareGeminiContext(config);
            cacheName = contextResult.cacheName;
            remainingDocIds = contextResult.remainingDocIds;
            cachedResources = contextResult.cachedResources;
            geminiUris = contextResult.geminiUris;
        }

        // Use homiletical proposition as search query
        const searchQuery = analysis.homileticalProposition;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext, remainingDocIds, cachedResources) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        const finalConfig = hydratedConfig ? { ...hydratedConfig, cacheName, geminiUris } : { ...defaultConfig, cacheName, geminiUris };

        const draft = await this.generator.generateSermonDraft(analysis, rules, finalConfig);
        return { draft, cacheName };
    }

    // ========== TWO-PHASE HOMILETICS GENERATION (NEW) ==========

    /**
     * Phase 1: Generate homiletical approach previews
     * 
     * Returns 4-5 lightweight approach options without full proposition or outline.
     * This is significantly faster (~3-5s) than full generation.
     * 
     * @pattern Application Service - Orchestrates infrastructure concerns
     * @solid SRP - Coordinates context preparation and preview generation
     */
    async generateHomileticsPreview(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ previews: import('@dosfilos/domain').HomileticalApproachPreview[]; cacheName?: string; cachedResources?: Array<{ title: string; author: string }> }> {
        let cacheName: string | undefined;
        let remainingDocIds: string[] | undefined;
        let geminiUris: string[] | undefined;
        let cachedResources: Array<{ title: string; author: string }> | undefined;

        // Prepare Gemini Context Cache (same as before)
        if (config && userId) {
            const contextResult = await this.prepareGeminiContext(config);
            cacheName = contextResult.cacheName;
            remainingDocIds = contextResult.remainingDocIds;
            cachedResources = contextResult.cachedResources;
            geminiUris = contextResult.geminiUris;
        }

        // Use passage + proposition as search query for better relevance
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition}`;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext, remainingDocIds, cachedResources) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        const finalConfig = hydratedConfig ? { ...hydratedConfig, cacheName, geminiUris } : { ...defaultConfig, cacheName, geminiUris };

        // 🎯 Call NEW generator method for previews
        const previews = await this.generator.generateHomileticsPreview(exegesis, rules, finalConfig);
        return { previews, cacheName, cachedResources };
    }

    /**
     * Phase 2: Develop a selected approach into full detail
     * 
     * Takes the preview chosen by the user and generates the complete
     * proposition and outline. Uses the same cache from Phase 1.
     * 
     * @pattern Application Service - Orchestrates infrastructure concerns
     * @solid SRP - Coordinates approach development
     */
    async developSelectedApproach(
        exegesis: ExegeticalStudy,
        selectedPreview: import('@dosfilos/domain').HomileticalApproachPreview,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ approach: import('@dosfilos/domain').HomileticalApproach; cacheName?: string }> {
        let cacheName: string | undefined;
        let remainingDocIds: string[] | undefined;
        let geminiUris: string[] | undefined;
        let cachedResources: Array<{ title: string; author: string }> | undefined;

        // Reuse existing cache if available, otherwise prepare new one
        if (config && userId) {
            // If config already has cacheName, reuse it (from Phase 1)
            if (config.cacheName) {
                cacheName = config.cacheName;
                // No need to prepare context again, just use existing cache
            } else {
                const contextResult = await this.prepareGeminiContext(config);
                cacheName = contextResult.cacheName;
                remainingDocIds = contextResult.remainingDocIds;
                cachedResources = contextResult.cachedResources;
                geminiUris = contextResult.geminiUris;
            }
        }

        // Use passage + proposition as search query
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition}`;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext, remainingDocIds, cachedResources) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        const finalConfig = hydratedConfig ? { ...hydratedConfig, cacheName, geminiUris } : { ...defaultConfig, cacheName, geminiUris };

        // 🎯 Call NEW generator method to develop approach
        const approach = await this.generator.developSelectedApproach(exegesis, selectedPreview, rules, finalConfig);
        return { approach, cacheName };
    }

    async refineContent(content: string, instruction: string, context?: any): Promise<string> {
        return this.generator.refineContent(content, instruction, context);
    }

    isAvailable(): boolean {
        return !!import.meta.env.VITE_GEMINI_API_KEY;
    }
}

export const sermonGeneratorService = new SermonGeneratorService();
