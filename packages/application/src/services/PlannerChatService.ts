import { GeminiSermonGenerator, DocumentProcessingService, AutomaticStrategySelector } from '@dosfilos/infrastructure';
import { ChatMessage, WorkflowPhase, LibraryResourceEntity, DocumentChunkEntity, CoachingStyle } from '@dosfilos/domain';

// Type for sources info to display in UI
export interface SourceReference {
    author: string;
    title: string;
    page?: number;
    snippet: string;
}

export interface ChatResponseWithSources {
    content: string;
    sources: SourceReference[];
    strategyUsed: CoachingStyle;
}

export class PlannerChatService {
    private generator: GeminiSermonGenerator;
    private documentProcessor: DocumentProcessingService;
    private strategySelector: AutomaticStrategySelector;
    private history: ChatMessage[] = [];
    private sourcesPerMessage: Map<string, SourceReference[]> = new Map();
    private userPreferredStyle: CoachingStyle | 'auto' = 'auto';

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API Key not found');
        this.generator = new GeminiSermonGenerator(apiKey);
        this.documentProcessor = new DocumentProcessingService(apiKey);
        this.strategySelector = new AutomaticStrategySelector();
    }

    private listeners: (() => void)[] = [];

    /**
     * Set user's preferred coaching style
     */
    setCoachingStyle(style: CoachingStyle | 'auto') {
        this.userPreferredStyle = style;
        console.log(`🎯 [Chat] Coaching style set to: ${style}`);
    }

    /**
     * Get current coaching style preference
     */
    getCoachingStyle(): CoachingStyle | 'auto' {
        return this.userPreferredStyle;
    }

    async sendMessage(
        message: string,
        context: {
            type: string;
            topicOrBook: string;
            resources: LibraryResourceEntity[];
        }
    ): Promise<ChatResponseWithSources> {
        // Add user message to history
        const userMessageId = `user_${Date.now()}`;
        this.history.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        this.notifyListeners();

        try {
            // Select coaching strategy based on message and user preference
            const strategy = await this.strategySelector.selectStrategy(
                message,
                context,
                this.userPreferredStyle
            );
            const strategyPromptAdditions = strategy.buildSystemPromptAdditions();

            console.log(`🧠 [Chat] Using ${strategy.getStyle()} strategy for this message`);

            // Search for relevant chunks in the user's library using RAG
            const resourceIds = context.resources.map(r => r.id);
            let relevantChunks: DocumentChunkEntity[] = [];
            let sources: SourceReference[] = [];

            console.log(`📚 [Chat] Resources for search: ${resourceIds.length} resources`, resourceIds);

            if (resourceIds.length > 0) {
                // Use only the user's message for semantic search - topic was polluting results
                const searchQuery = message;
                console.log(`🔍 [Chat] Searching for relevant chunks: "${searchQuery.substring(0, 50)}..."`);

                try {
                    const searchResults = await this.documentProcessor.searchRelevantChunks(
                        searchQuery,
                        resourceIds,
                        10 // Get top 10 chunks for chat context
                    );
                    relevantChunks = searchResults.map(r => r.chunk);
                    console.log(`✅ [Chat] Found ${relevantChunks.length} relevant chunks from library`);

                    // Convert chunks to source references for UI display
                    sources = relevantChunks.map(chunk => ({
                        author: chunk.resourceAuthor,
                        title: chunk.resourceTitle,
                        page: chunk.metadata.page,
                        snippet: chunk.text.substring(0, 150) + '...'
                    }));
                } catch (error) {
                    console.warn('⚠️ RAG search failed for chat:', error);
                }
            }

            // Build enriched context with RAG results AND strategy prompt
            const enrichedContext = {
                ...context,
                relevantChunks,
                hasLibraryContext: relevantChunks.length > 0,
                strategyPromptAdditions // Pass strategy additions to prompt builder
            };

            const response = await this.generator.chat(
                WorkflowPhase.PLANNING,
                this.history,
                enrichedContext
            );

            // Add assistant response to history
            const assistantMessageId = `assistant_${Date.now()}`;
            this.history.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
            });

            // Store sources for this message
            this.sourcesPerMessage.set(assistantMessageId, sources);

            this.notifyListeners();

            return { content: response, sources, strategyUsed: strategy.getStyle() };
        } catch (error) {
            // Remove user message if failed
            this.history.pop();
            this.notifyListeners();
            throw error;
        }
    }

    getHistory(): ChatMessage[] {
        return [...this.history];
    }

    getSourcesForMessage(messageIndex: number): SourceReference[] {
        // Get the nth assistant message's sources
        const assistantKeys = Array.from(this.sourcesPerMessage.keys());
        if (messageIndex < assistantKeys.length) {
            return this.sourcesPerMessage.get(assistantKeys[messageIndex]) || [];
        }
        return [];
    }

    clearHistory() {
        this.history = [];
        this.sourcesPerMessage.clear();
        this.notifyListeners();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }
}

export const plannerChatService = new PlannerChatService();
