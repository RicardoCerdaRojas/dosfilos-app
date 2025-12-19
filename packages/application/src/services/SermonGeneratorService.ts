import { ISermonGenerator, ExegeticalStudy, HomileticalAnalysis, GenerationRules, PhaseDocument, FileSearchStoreContext, ICoreLibraryService, SermonContent } from '@dosfilos/domain';
import { GeminiSermonGenerator, DocumentProcessingService } from '@dosfilos/infrastructure';

import { PhaseConfiguration } from '@dosfilos/domain';
import { FirebaseStorageService } from '@dosfilos/infrastructure';

// Extended config that includes library document IDs and File Search Store
export interface ExtendedPhaseConfiguration extends PhaseConfiguration {
    fileSearchStoreId?: string; // 🎯 NEW: File Search Store ID for core library
    aiModel?: string;          // 🎯 NEW: AI Model to use (e.g. gemini-2.5-flash)
    temperature?: number;      // Ensure temperature is explicitly recognized
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
    private coreLibraryService: ICoreLibraryService | null = null; // 🎯 NEW

    constructor(coreLibraryService?: ICoreLibraryService) {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('Gemini API key not configured. Generator features will be disabled.');
        }
        this.generator = new GeminiSermonGenerator(apiKey || '');
        this.storageService = new FirebaseStorageService();
        this.coreLibraryService = coreLibraryService || null; // 🎯 NEW

        // Initialize services
        if (apiKey) {
            this.documentProcessor = new DocumentProcessingService(apiKey);
        }
    }

    /**
     * 🎯 NEW: Dependency Injection setter
     * Allows injecting the service after instantiation (e.g. from React Context)
     */
    setCoreLibraryService(service: ICoreLibraryService) {
        this.coreLibraryService = service;

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
            console.log(`📚[RAG] Searching ${libraryDocIds.length} library documents for: "${searchQuery.substring(0, 50)}..."`);

            const results = await this.documentProcessor.searchRelevantChunks(
                searchQuery,
                libraryDocIds,
                topK
            );

            if (results.length === 0) {
                console.log('📚 [RAG] No relevant chunks found');
                return [];
            }

            console.log(`✅[RAG] Found ${results.length} relevant chunks`);

            // Convert chunks to PhaseDocument format
            return results.map((result, index) => ({
                id: `rag - ${index} `,
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
     * Hydrate config with legacy document content + RAG context
     */
    private async hydrateConfig(
        config: ExtendedPhaseConfiguration,
        ragContext?: RAGContext
    ): Promise<PhaseConfiguration> {
        // 1. Hydrate legacy documents (from storage)
        const hydratedLegacyDocs = await Promise.all(config.documents.map(async (doc) => {
            if (doc.storagePath) {
                try {
                    const content = await this.storageService.downloadFile(doc.storagePath);
                    const text = await content.text();
                    return { ...doc, content: text };
                } catch (error) {
                    console.error(`Failed to download document ${doc.name}: `, error);
                    return doc;
                }
            }
            return doc;
        }));

        // 2. Fetch RAG context from library documents
        // Since we are moving to Global Context, this might be less relevant for sermon generation
        // but kept for backward compatibility if libraryDocIds are passed manually
        const docIdsToSearch = config.libraryDocIds;

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
            documents: [...ragDocuments, ...hydratedLegacyDocs]
        };
    }

    async generateExegesis(
        passage: string,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ exegesis: ExegeticalStudy; cacheName?: string }> {
        let fileSearchStoreId: string | undefined = config?.fileSearchStoreId; // 🎯 NEW: check config first

        // 🎯 NEW: Get File Search Store for Exegesis context if not provided
        if (!fileSearchStoreId && this.coreLibraryService?.isInitialized()) {
            try {
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.EXEGESIS);

            } catch (error) {
                console.warn('⚠️ Could not get File Search Store for Exegesis:', error);
            }
        }

        const ragContext = userId ? { query: passage, userId } : undefined;

        // Ensure we don't overwrite the explicitly set ID with an undefined one if something goes wrong
        // But since we derive the final config below, it's safer to ensure hydratedConfig preserves it if we don't set it here.
        // Actually, simpler logic:

        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        // Inject fileSearchStoreId into config for the generator
        // If hydratedConfig has it, use it. If not, use the fallback.
        // Wait, my logic above sets 'fileSearchStoreId' correctly.
        const finalConfig = hydratedConfig
            ? { ...hydratedConfig, fileSearchStoreId }
            : { ...defaultConfig, fileSearchStoreId };

        const exegesis = await this.generator.generateExegesis(passage, rules, finalConfig);
        return { exegesis };
    }

    async generateHomiletics(
        exegesis: ExegeticalStudy,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ homiletics: HomileticalAnalysis; cacheName?: string }> {
        let fileSearchStoreId: string | undefined = config?.fileSearchStoreId; // 🎯 NEW

        // 🎯 NEW: Get Default File Search Store for Homiletics if not provided
        if (!fileSearchStoreId && this.coreLibraryService?.isInitialized()) {
            try {
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);

            } catch (error) {
                console.warn('⚠️ Could not get File Search Store for Homiletics:', error);
            }
        }

        // Use passage + proposition as search query for better relevance
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition} `;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        const finalConfig = hydratedConfig
            ? { ...hydratedConfig, fileSearchStoreId: fileSearchStoreId || hydratedConfig.fileSearchStoreId }
            : { ...defaultConfig, fileSearchStoreId };

        const homiletics = await this.generator.generateHomiletics(exegesis, rules, finalConfig);
        return { homiletics };
    }

    async generateSermonDraft(
        analysis: HomileticalAnalysis,
        rules: GenerationRules,
        config?: ExtendedPhaseConfiguration,
        userId?: string
    ): Promise<{ draft: SermonContent; cacheName?: string }> {
        // Use homiletical proposition as search query
        const searchQuery = analysis.homileticalProposition;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        // 🎯 Get File Search Store for Drafting (use Homiletics)
        let fileSearchStoreId: string | undefined;
        if (this.coreLibraryService?.isInitialized()) {
            try {
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);

            } catch (error) {
                console.warn('⚠️ Could not get File Search Store for Drafting:', error);
            }
        }

        const finalConfig = hydratedConfig
            ? { ...hydratedConfig, fileSearchStoreId }
            : { ...defaultConfig, fileSearchStoreId };

        const draft = await this.generator.generateSermonDraft(analysis, rules, finalConfig);
        return { draft };
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
        // Use passage + proposition as search query for better relevance
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition} `;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        // 🎯 NEW: Get File Search Store for Homiletics context
        let fileSearchStoreId: string | undefined = config?.fileSearchStoreId; // 🎯 NEW

        // 🎯 NEW: Get Default File Search Store for Homiletics if not provided
        if (!fileSearchStoreId && this.coreLibraryService?.isInitialized()) {
            try {
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);

            } catch (error) {
                console.warn('⚠️ Could not get File Search Store for Preview:', error);
            }
        }

        const finalConfig = hydratedConfig
            ? { ...hydratedConfig, fileSearchStoreId: fileSearchStoreId || hydratedConfig.fileSearchStoreId }
            : { ...config, fileSearchStoreId } as PhaseConfiguration; // Fallback if no hydration needed for previews

        // 🎯 Call NEW generator method for previews
        const previews = await this.generator.generateHomileticsPreview(exegesis, rules, finalConfig);
        return { previews };
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
        // Use passage + proposition as search query
        const searchQuery = `${exegesis.passage} ${exegesis.exegeticalProposition} `;
        const ragContext = userId ? { query: searchQuery, userId } : undefined;
        const hydratedConfig = config ? await this.hydrateConfig(config, ragContext) : undefined;

        const defaultConfig: PhaseConfiguration = {
            basePrompt: '',
            userPrompts: [],
            documents: [],
            temperature: 0.7
        };

        // 🎯 NEW: Get File Search Store for Homiletics context
        let fileSearchStoreId: string | undefined = config?.fileSearchStoreId; // 🎯 NEW

        // 🎯 NEW: Get Default File Search Store if not provided
        if (!fileSearchStoreId && this.coreLibraryService?.isInitialized()) {
            try {
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);

            } catch (error) {
                console.warn('⚠️ Could not get File Search Store for Develop:', error);
            }
        }

        const finalConfig = hydratedConfig
            ? { ...hydratedConfig, fileSearchStoreId: fileSearchStoreId || hydratedConfig.fileSearchStoreId }
            : { ...defaultConfig, fileSearchStoreId };

        // 🎯 Call NEW generator method to develop approach
        const approach = await this.generator.developSelectedApproach(exegesis, selectedPreview, rules, finalConfig);
        return { approach };
    }

    async refineContent(content: string, instruction: string, context?: any): Promise<string> {
        const enrichedContext = { ...context };

        // 🎯 NEW: Inject File Search Store ID based on phase
        if (this.coreLibraryService?.isInitialized()) {
            try {
                let storeId: string | undefined;
                const phase = context?.phase as string;

                if (phase === 'exegesis') {
                    storeId = this.coreLibraryService.getStoreId(FileSearchStoreContext.EXEGESIS);
                } else if (phase === 'homiletics' || phase === 'sermon') {
                    storeId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);
                } else {
                    // Default to Homiletics/General
                    storeId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);
                }

                if (storeId) {
                    enrichedContext.fileSearchStoreId = storeId;

                }
            } catch (e) {
                console.warn('⚠️ [Refine] Failed to inject store ID:', e);
            }
        }

        return this.generator.refineContent(content, instruction, enrichedContext);
    }

    isAvailable(): boolean {
        return !!(import.meta as any).env.VITE_GEMINI_API_KEY;
    }
}

export const sermonGeneratorService = new SermonGeneratorService();
