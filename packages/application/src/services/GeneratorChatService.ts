import { GeminiSermonGenerator, DocumentProcessingService, AutomaticStrategySelector, GeminiFileSearchService } from '@dosfilos/infrastructure';
import { ChatMessage, WorkflowPhase, LibraryResourceEntity, DocumentChunkEntity, CoachingStyle, ContentType } from '@dosfilos/domain';
import { SourceReference, ChatResponseWithSources } from './PlannerChatService';

interface StoredHistory {
    sermonId: string;
    phase: ContentType;
    messages: ChatMessage[];
    sourcesPerMessage: Record<string, SourceReference[]>;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY_PREFIX = 'generator_chat_history_';
const DEFAULT_TTL_DAYS = 7;

/**
 * Generator Chat Service
 * 
 * Provides AI-powered chat assistance for the sermon generator with:
 * - Sermon-scoped history (persisted in localStorage with TTL)
 * - RAG integration (full library + phase-specific documents)
 * - Coaching styles support
 * - Source references
 */
export class GeneratorChatService {
    private generator: GeminiSermonGenerator;
    private documentProcessor: DocumentProcessingService;
    private fileSearch: GeminiFileSearchService;
    private strategySelector: AutomaticStrategySelector;
    private history: ChatMessage[] = [];
    private sourcesPerMessage: Map<string, SourceReference[]> = new Map();
    private userPreferredStyle: CoachingStyle | 'auto' = 'auto';
    private currentSermonId: string | null = null;
    private currentPhase: ContentType = 'exegesis';
    private listeners: (() => void)[] = [];

    constructor() {
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API Key not found');
        this.generator = new GeminiSermonGenerator(apiKey);
        this.documentProcessor = new DocumentProcessingService(apiKey);
        this.fileSearch = new GeminiFileSearchService(apiKey);
        this.strategySelector = new AutomaticStrategySelector();

        // Clean up expired histories on initialization
        this.cleanupExpiredHistories();
    }

    async testGeminiSearch(message: string, storeName: string): Promise<string> {
        return this.fileSearch.chatWithStore(message, storeName);
    }

    /**
     * Initialize the service for a specific sermon and phase
     */
    initializeForSermon(sermonId: string, phase: ContentType): void {
        this.currentSermonId = sermonId;
        this.currentPhase = phase;

        // Try to load existing history
        const stored = this.loadHistory(sermonId, phase);
        if (stored) {
            this.history = stored.messages;
            this.sourcesPerMessage = new Map(Object.entries(stored.sourcesPerMessage));

        } else {
            this.history = [];
            this.sourcesPerMessage.clear();

        }

        this.notifyListeners();
    }

    /**
     * Set user's preferred coaching style
     */
    setCoachingStyle(style: CoachingStyle | 'auto'): void {
        this.userPreferredStyle = style;

    }

    /**
     * Get current coaching style preference
     */
    getCoachingStyle(): CoachingStyle | 'auto' {
        return this.userPreferredStyle;
    }

    /**
     * Regenerate a specific sermon point
     */
    async regenerateSermonPoint(
        point: any,
        context: {
            sermonTitle: string;
            homileticalProposition: string;
            tone?: string;
            customInstructions?: string;
            libraryResources: LibraryResourceEntity[];
        }
    ): Promise<{ point: any; sources: SourceReference[] }> {
        // 1. Search for relevant content in library (RAG)
        const relevantChunks = await this.searchLibrary(
            `Punto: ${point.point || point.title}. Referencias: ${point.scriptureReferences?.join(', ')}`,
            context.libraryResources
        );

        // 2. Convert chunks to source references
        const sources: SourceReference[] = relevantChunks.map(chunk => ({
            author: chunk.resourceAuthor,
            title: chunk.resourceTitle,
            page: chunk.metadata.page,
            snippet: chunk.text.substring(0, 150) + '...'
        }));

        // 3. Call generator with context
        const regeneratedPoint = await this.generator.regenerateSermonPoint(
            point,
            {
                tone: (context.tone as any) || 'inspirational',
                customInstructions: context.customInstructions
            },
            {
                sermonTitle: context.sermonTitle,
                homileticalProposition: context.homileticalProposition,
                hasLibraryContext: relevantChunks.length > 0,
                relevantChunks
            }
        );

        return { point: regeneratedPoint, sources };
    }

    /**
     * Send a message and get AI response with sources
     */
    async sendMessage(
        message: string,
        context: {
            passage: string;
            currentContent?: any;
            focusedSection?: string | null;
            libraryResources: LibraryResourceEntity[];
            phaseResources?: LibraryResourceEntity[];
            cacheName?: string;
        }
    ): Promise<ChatResponseWithSources> {
        // Add user message to history
        this.history.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        this.notifyListeners();
        this.saveHistory();

        try {
            // Select coaching strategy
            const strategy = await this.strategySelector.selectStrategy(
                message,
                {
                    type: this.currentPhase,
                    topicOrBook: context.passage,
                    resources: context.libraryResources
                },
                this.userPreferredStyle
            );
            const strategyPromptAdditions = strategy.buildSystemPromptAdditions();


            // Collect all resource IDs for RAG search
            // Priority: phase-specific + entire library
            const allResources = new Map<string, LibraryResourceEntity>();

            // Add library resources
            for (const r of context.libraryResources) {
                allResources.set(r.id, r);
            }

            // Add phase-specific resources (they get added, duplicates filtered by Map)
            if (context.phaseResources) {
                for (const r of context.phaseResources) {
                    allResources.set(r.id, r);
                }
            }

            const resourceIds = Array.from(allResources.keys());
            let relevantChunks: DocumentChunkEntity[] = [];
            let sources: SourceReference[] = [];

            // DECISION: Use Gemini Cache if available, otherwise fallback to Manual RAG
            if (context.cacheName) {


                // When using cache, we populate sources with the cached resources for display
                // The actual content is already available to the model via the cache
                const cachedResources = Array.from(allResources.values())
                    .filter(r => r.metadata?.geminiUri);

                sources = cachedResources.map(r => ({
                    author: r.author,
                    title: r.title,
                    snippet: '(Contenido completo disponible en caché)'
                }));


            } else {
                // FALLBACK: Manual RAG search


                if (resourceIds.length > 0) {
                    // Build search query from message + context
                    const searchQuery = context.focusedSection
                        ? `${message} ${context.focusedSection}`
                        : message;

                    try {
                        const searchResults = await this.documentProcessor.searchRelevantChunks(
                            searchQuery,
                            resourceIds,
                            5 // Top 5 chunks
                        );
                        relevantChunks = searchResults.map(r => r.chunk);


                        // Convert to source references
                        sources = relevantChunks.map(chunk => ({
                            author: chunk.resourceAuthor,
                            title: chunk.resourceTitle,
                            page: chunk.metadata.page,
                            snippet: chunk.text.substring(0, 150) + '...'
                        }));
                    } catch (error) {
                        console.warn('⚠️ [GeneratorChat] RAG search failed:', error);
                    }
                }
            }

            // Build enriched context
            const enrichedContext = {
                type: this.currentPhase,
                topicOrBook: context.passage,
                resources: Array.from(allResources.values()),
                relevantChunks,
                hasLibraryContext: context.cacheName ? true : relevantChunks.length > 0,
                strategyPromptAdditions,
                focusedSection: context.focusedSection,
                currentContent: context.currentContent,
                cacheName: context.cacheName, // Pass cacheName to generator
                // 🎯 NEW: Pass geminiUris for Multimodal RAG fallback if cache is missing
                geminiUris: context.cacheName ? undefined : Array.from(allResources.values())
                    .map(r => r.metadata?.geminiUri)
                    .filter((uri): uri is string => !!uri)
            };

            // Get phase for chat
            const workflowPhase = this.contentTypeToWorkflowPhase(this.currentPhase);

            const response = await this.generator.chat(
                workflowPhase,
                this.history,
                enrichedContext
            );

            // Add assistant response to history
            const messageId = `assistant_${Date.now()}`;
            this.history.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
            });

            // Store sources
            this.sourcesPerMessage.set(messageId, sources);

            this.notifyListeners();
            this.saveHistory();

            return {
                content: response,
                sources,
                strategyUsed: strategy.getStyle()
            };
        } catch (error) {
            // Remove user message on failure
            this.history.pop();
            this.notifyListeners();
            this.saveHistory();
            throw error;
        }
    }

    /**
     * Get current message history
     */
    getHistory(): ChatMessage[] {
        return [...this.history];
    }

    /**
     * Get sources for a specific message index
     */
    getSourcesForMessage(messageIndex: number): SourceReference[] {
        const assistantKeys = Array.from(this.sourcesPerMessage.keys());
        if (messageIndex < assistantKeys.length) {
            const key = assistantKeys[messageIndex];
            if (key) {
                return this.sourcesPerMessage.get(key) || [];
            }
        }
        return [];
    }

    /**
     * Clear current session history
     */
    clearHistory(): void {
        this.history = [];
        this.sourcesPerMessage.clear();
        if (this.currentSermonId && this.currentPhase) {
            this.removeStoredHistory(this.currentSermonId, this.currentPhase);
        }
        this.notifyListeners();
    }

    /**
     * Subscribe to history changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    private contentTypeToWorkflowPhase(contentType: ContentType): WorkflowPhase {
        switch (contentType) {
            case 'exegesis': return WorkflowPhase.EXEGESIS;
            case 'homiletics': return WorkflowPhase.HOMILETICS;
            case 'sermon': return WorkflowPhase.DRAFTING;
            default: return WorkflowPhase.EXEGESIS;
        }
    }

    private async searchLibrary(query: string, resources: LibraryResourceEntity[]): Promise<DocumentChunkEntity[]> {
        if (!resources || resources.length === 0) return [];

        try {
            // Filter resources that are ready (indexed)
            const indexedResources = resources.filter(r => r.textExtractionStatus === 'ready');
            if (indexedResources.length === 0) return [];

            // Search across all indexed resources
            const allChunks: DocumentChunkEntity[] = [];

            // Let's limit to searching the first 5 resources for now to avoid performance issues
            const resourcesToSearch = indexedResources.slice(0, 5);

            // Collect all resource IDs to search in one go if possible, 
            // but searchRelevantChunks takes an array of IDs, so we can pass them all!
            const resourceIds = resourcesToSearch.map(r => r.id);

            if (resourceIds.length > 0) {
                const results = await this.documentProcessor.searchRelevantChunks(query, resourceIds, 5);
                allChunks.push(...results.map(r => r.chunk));
            }

            return allChunks;
        } catch (error) {
            console.warn('⚠️ [GeneratorChat] Library search failed:', error);
            return [];
        }
    }

    private getStorage(): any {
        if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
            return (globalThis as any).localStorage;
        }
        return null;
    }

    // --- LocalStorage Persistence ---

    private getStorageKey(sermonId: string, phase: ContentType): string {
        return `${STORAGE_KEY_PREFIX}${sermonId}_${phase}`;
    }

    private saveHistory(): void {
        if (!this.currentSermonId || !this.currentPhase) return;

        const stored: StoredHistory = {
            sermonId: this.currentSermonId,
            phase: this.currentPhase,
            messages: this.history,
            sourcesPerMessage: Object.fromEntries(this.sourcesPerMessage),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const storage = this.getStorage();
        if (!storage) return;

        try {
            const key = this.getStorageKey(this.currentSermonId, this.currentPhase);
            storage.setItem(key, JSON.stringify(stored));
        } catch (error) {
            console.warn('⚠️ [GeneratorChat] Failed to save history:', error);
        }
    }

    private loadHistory(sermonId: string, phase: ContentType): StoredHistory | null {
        const storage = this.getStorage();
        if (!storage) return null;

        try {
            const key = this.getStorageKey(sermonId, phase);
            const stored = storage.getItem(key);
            if (!stored) return null;

            const parsed: StoredHistory = JSON.parse(stored);

            // Check TTL
            const ttlMs = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
            if (Date.now() - parsed.updatedAt > ttlMs) {

                storage.removeItem(key);
                return null;
            }

            // Restore Date objects
            parsed.messages = parsed.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }));

            return parsed;
        } catch (error) {
            console.warn('⚠️ [GeneratorChat] Failed to load history:', error);
            return null;
        }
    }

    private removeStoredHistory(sermonId: string, phase: ContentType): void {
        const storage = this.getStorage();
        if (!storage) return;

        try {
            const key = this.getStorageKey(sermonId, phase);
            storage.removeItem(key);
        } catch (error) {
            console.warn('⚠️ [GeneratorChat] Failed to remove history:', error);
        }
    }

    private cleanupExpiredHistories(): void {
        const storage = this.getStorage();
        if (!storage) return;

        try {
            const ttlMs = DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const keysToRemove: string[] = [];

            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;

                try {
                    const stored = storage.getItem(key);
                    if (!stored) continue;

                    const parsed: StoredHistory = JSON.parse(stored);
                    if (now - parsed.updatedAt > ttlMs) {
                        keysToRemove.push(key);
                    }
                } catch {
                    // Invalid data, remove it
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => storage.removeItem(key));
            if (keysToRemove.length > 0) {

            }
        } catch (error) {
            console.warn('⚠️ [GeneratorChat] Cleanup failed:', error);
        }
    }
}

// Singleton instance
export const generatorChatService = new GeneratorChatService();
