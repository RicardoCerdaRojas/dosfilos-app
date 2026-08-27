import { GeminiSermonGenerator, DocumentProcessingService, AutomaticStrategySelector } from '@dosfilos/infrastructure';
import { LibraryResourceEntity, DocumentChunkEntity, CoachingStyle, ContentType, ICoreLibraryService, FileSearchStoreContext, DEFAULT_LANGUAGE } from '@dosfilos/domain';
import type {
    SupportedLanguage,
    GenerationRules,
    HomileticalAnalysis,
    ISermonWizardChatRepository,
    SermonWizardChatHistory,
    SermonWizardChatPhase,
} from '@dosfilos/domain';
import { ChatMessage, WorkflowPhase } from '@dosfilos/domain/src/entities/SermonWorkflow';
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
    private strategySelector: AutomaticStrategySelector;
    private history: ChatMessage[] = [];
    private sourcesPerMessage: Map<string, SourceReference[]> = new Map();
    private userPreferredStyle: CoachingStyle | 'auto' = 'auto';
    private currentSermonId: string | null = null;
    private currentPhase: ContentType = 'exegesis';
    private listeners: (() => void)[] = [];
    private coreLibraryService: ICoreLibraryService | null = null; // 🎯 NEW
    // PR #219: Firestore persistence layer. When wired the service
    // dual-writes (localStorage first for sync fallback, Firestore for
    // cross-device durability). When unset, only localStorage is used.
    // Setter pattern mirrors `setCoreLibraryService` so app boot stays
    // backward-compatible.
    private wizardChatRepository: ISermonWizardChatRepository | null = null;
    private firestoreLoadedFor: string | null = null;

    constructor() {
        this.generator = new GeminiSermonGenerator();
        this.documentProcessor = new DocumentProcessingService();
        this.strategySelector = new AutomaticStrategySelector();

        // Clean up expired histories on initialization
        this.cleanupExpiredHistories();
    }

    /**
     * 🎯 NEW: Dependency Injection setter
     */
    setCoreLibraryService(service: ICoreLibraryService) {
        this.coreLibraryService = service;

    }

    /**
     * PR #219: Injects Firestore-backed persistence for wizard chat
     * history. Once set, `saveHistory()` dual-writes (localStorage +
     * Firestore) and `initializeForSermon()` hydrates from Firestore
     * when localStorage is missing or stale (cross-device support).
     *
     * Without this setter the service falls back to localStorage-only
     * behavior (pre-PR #219). Tests + standalone consumers don't need
     * to wire it.
     */
    setWizardChatRepository(repo: ISermonWizardChatRepository) {
        this.wizardChatRepository = repo;
    }

    /**
     * Tracks whether the current chat key represents a real sermon
     * document. False when the caller passed a non-sermon fallback key
     * (e.g. WorkflowConfiguration id for the tutor surface, or a
     * Step-1 ephemeral key) — in that case Firestore reads/writes are
     * skipped because the rule check `get(/sermons/{key})` would
     * deterministically fail and just produce console noise.
     */
    private persistRemote = false;

    /**
     * Initialize the service for a specific sermon and phase.
     *
     * `options.persistToFirestore` defaults to `true` (real sermon case
     * — same behavior as before). Pass `false` for non-sermon chat
     * surfaces (tutor, Step 1 wizard pre-sermon-creation, etc.) so the
     * service only hits localStorage and skips the Firestore round-trip
     * that would log a permission-denied error.
     */
    initializeForSermon(
        sermonId: string,
        phase: ContentType,
        options: { persistToFirestore?: boolean; adoptFromKey?: string } = {},
    ): void {
        this.currentSermonId = sermonId;
        this.currentPhase = phase;
        this.firestoreLoadedFor = null;
        this.persistRemote = options.persistToFirestore ?? true;

        // Try localStorage first (sync, no I/O). Synchronous so the
        // UI can render the cached conversation immediately on mount.
        const stored = this.loadHistory(sermonId, phase);
        if (stored) {
            this.history = stored.messages;
            this.sourcesPerMessage = new Map(Object.entries(stored.sourcesPerMessage));
        } else if (this.adoptHistoryFrom(options.adoptFromKey, sermonId, phase)) {
            // La conversación viajó con el pastor: ver `adoptHistoryFrom`.
        } else {
            this.history = [];
            this.sourcesPerMessage.clear();
        }

        this.notifyListeners();

        // Then, if a Firestore repo is wired AND the caller asked for
        // remote persistence (real sermon case), hydrate from Firestore
        // in the background. Cross-device case: user worked on the
        // sermon on desktop, then opens it on tablet — desktop chat
        // is in Firestore but absent from tablet localStorage.
        // Compare timestamps to keep the newer snapshot.
        if (this.wizardChatRepository && this.persistRemote) {
            const phaseKey = phase as SermonWizardChatPhase;
            this.wizardChatRepository
                .load(sermonId, phaseKey)
                .then((remote) => {
                    // Skip if user has navigated away to another sermon/phase.
                    if (this.currentSermonId !== sermonId || this.currentPhase !== phase) return;
                    if (!remote) return;
                    const localUpdatedAt = stored?.updatedAt ?? 0;
                    const remoteUpdatedAt = remote.updatedAt instanceof Date
                        ? remote.updatedAt.getTime()
                        : Number(remote.updatedAt ?? 0);
                    // Only swap if remote is strictly newer than the
                    // local snapshot the UI already showed. Avoids
                    // visible reset when local was fresher.
                    if (remoteUpdatedAt > localUpdatedAt && remote.messages.length > 0) {
                        this.history = remote.messages;
                        // Normalize SermonWizardChatSource (optional fields) to
                        // SourceReference (required author/title/snippet) — fields
                        // are always written from SourceReference in saveHistory,
                        // so empty-string fallback is just type-safety belt.
                        const normalized = new Map<string, SourceReference[]>();
                        for (const [k, arr] of Object.entries(remote.sourcesPerMessage)) {
                            normalized.set(k, (arr ?? []).map((s) => ({
                                author: s.author ?? '',
                                title: s.title ?? '',
                                page: typeof s.page === 'string' ? Number(s.page) || undefined : s.page,
                                snippet: s.snippet ?? '',
                            })));
                        }
                        this.sourcesPerMessage = normalized;
                        this.notifyListeners();
                    }
                    this.firestoreLoadedFor = `${sermonId}:${phase}`;
                })
                .catch((err) => {
                    console.warn('[GeneratorChat] Firestore hydration failed; using localStorage state', err);
                });
        }
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
            aiModel?: string;      // 🎯 NEW
            temperature?: number;  // 🎯 NEW
            language?: SupportedLanguage;
            /**
             * La voz del predicador y el nivel de rigor.
             *
             * Antes no llegaban: el punto regenerado salía sin las
             * ilustraciones del pastor, sin su énfasis pastoral y sin el techo
             * de rigor de su congregación — desentonando con los demás puntos
             * del mismo sermón, que sí los tenían.
             */
            personalization?: GenerationRules['personalization'];
            audienceRigor?: GenerationRules['audienceRigor'];
            /**
             * El análisis homilético completo.
             *
             * Es lo que le da al prompt el bosquejo real, la aplicación ya
             * aprobada de este punto y la directiva que el pastor escribió
             * sobre él. Sin esto el prompt sólo veía título y proposición.
             */
            homileticsResult?: HomileticalAnalysis;
        }
    ): Promise<{ point: any; sources: SourceReference[] }> {
        // 1. Search for relevant content in library (RAG)
        // 🎯 UPDATE: Check for Global Store first
        let relevantChunks: DocumentChunkEntity[] = [];
        let hasLibraryContext = false;
        let fileSearchStoreId: string | undefined;

        if (this.coreLibraryService?.isInitialized()) {
            try {
                // Use Homiletics store for drafting/refinement as requested ("general store")
                fileSearchStoreId = this.coreLibraryService.getStoreId(FileSearchStoreContext.HOMILETICS);

                hasLibraryContext = true;
            } catch (error) {
                console.warn('⚠️ [GeneratorChat] Could not get File Search Store:', error);
            }
        }

        // Fallback to manual RAG only if NO global store and YES local resources
        if (!fileSearchStoreId && context.libraryResources?.length > 0) {
            relevantChunks = await this.searchLibrary(
                `Punto: ${point.point || point.title}. Referencias: ${point.scriptureReferences?.join(', ')}`,
                context.libraryResources
            );
            hasLibraryContext = relevantChunks.length > 0;
        }

        // 2. Convert chunks to source references (if manual RAG)
        // If using Global Store, sources are embedded in citation (handled by infrastructure later? 
        // actually infrastructure returns text, we might not get structured citations easily here yet without simpler parsing.
        // For now, we return empty sources if using Global Store, or extract from response if possible.)
        const sources: SourceReference[] = relevantChunks.map(chunk => ({
            author: chunk.resourceAuthor,
            title: chunk.resourceTitle,
            page: chunk.metadata.page,
            snippet: chunk.text.substring(0, 150) + '...'
        }));

        // 3. Call generator with context
        const regenerateContext = {
            sermonTitle: context.sermonTitle,
            homileticalProposition: context.homileticalProposition,
            hasLibraryContext,
            relevantChunks,
            fileSearchStoreId,
            aiModel: context.aiModel,       // 🎯 NEW
            temperature: context.temperature, // 🎯 NEW
            // El bosquejo, las aplicaciones aprobadas y las directivas del
            // pastor viajan por acá.
            ...(context.homileticsResult ? { homileticsResult: context.homileticsResult } : {}),
        };

        const regeneratedPoint = await this.generator.regenerateSermonPoint(
            point,
            {
                tone: (context.tone as any) || 'pastoral',
                customInstructions: context.customInstructions,
                ...(context.personalization ? { personalization: context.personalization } : {}),
                ...(context.audienceRigor ? { audienceRigor: context.audienceRigor } : {}),
            },
            regenerateContext,
            context.language ?? DEFAULT_LANGUAGE,
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
            aiModel?: string;      // 🎯 NEW
            temperature?: number;  // 🎯 NEW
            language?: SupportedLanguage;
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
                    .filter((uri): uri is string => !!uri),
                // 🎯 NEW: Pass Global File Search Store ID
                fileSearchStoreId: '',
                aiModel: context.aiModel,       // 🎯 NEW
                temperature: context.temperature // 🎯 NEW
            };

            // 🎯 NEW: Inject Global Store ID if available
            if (this.coreLibraryService?.isInitialized()) {
                try {
                    // Determine which store to use based on the current phase
                    let contextType: FileSearchStoreContext;

                    switch (this.currentPhase) {
                        case 'exegesis':
                            contextType = FileSearchStoreContext.EXEGESIS;
                            break;
                        case 'homiletics':
                        case 'sermon': // Draft uses Homiletics store
                        default:
                            contextType = FileSearchStoreContext.HOMILETICS;
                            break;
                    }

                    const storeId = this.coreLibraryService.getStoreId(contextType);
                    enrichedContext.fileSearchStoreId = storeId;

                } catch (error) {
                    console.warn('⚠️ [GeneratorChat] Could not get File Search Store:', error);
                }
            }

            // Get phase for chat
            const workflowPhase = this.contentTypeToWorkflowPhase(this.currentPhase);

            const response = await this.generator.chat(
                workflowPhase,
                this.history,
                enrichedContext,
                context.language ?? DEFAULT_LANGUAGE,
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
     * Send a message and get AI response with streaming support
     */
    async sendMessageStream(
        message: string,
        context: {
            passage: string;
            currentContent?: any;
            focusedSection?: string | null;
            libraryResources: LibraryResourceEntity[];
            phaseResources?: LibraryResourceEntity[];
            cacheName?: string;
            aiModel?: string;      // 🎯 NEW
            temperature?: number;  // 🎯 NEW
            language?: SupportedLanguage;
        },
        onChunk: (chunk: string) => void
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
                    .filter((uri): uri is string => !!uri),
                // 🎯 NEW: Pass Global File Search Store ID
                fileSearchStoreId: '',
                aiModel: context.aiModel,       // 🎯 NEW
                temperature: context.temperature // 🎯 NEW
            };

            // 🎯 NEW: Inject Global Store ID if available
            if (this.coreLibraryService?.isInitialized()) {
                try {
                    // Determine which store to use based on the current phase
                    let contextType: FileSearchStoreContext;

                    switch (this.currentPhase) {
                        case 'exegesis':
                            contextType = FileSearchStoreContext.EXEGESIS;
                            break;
                        case 'homiletics':
                        case 'sermon': // Draft uses Homiletics store
                        default:
                            contextType = FileSearchStoreContext.HOMILETICS;
                            break;
                    }

                    const storeId = this.coreLibraryService.getStoreId(contextType);
                    enrichedContext.fileSearchStoreId = storeId;

                } catch (error) {
                    console.warn('⚠️ [GeneratorChat] Could not get File Search Store:', error);
                }
            }

            // Get phase for chat
            const workflowPhase = this.contentTypeToWorkflowPhase(this.currentPhase);

            const response = await this.generator.chatStream(
                workflowPhase,
                this.history,
                enrichedContext,
                onChunk,
                context.language ?? DEFAULT_LANGUAGE,
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
     * Analyze current chat history to extract passage, idea, and potentially a full draft.
     */
    async analyzeChatForSermon(): Promise<{ passage: string, idea: string, hasDraft: boolean, title: string, contentMarkdown: string }> {
        const historyCopy = [...this.history];
        if (historyCopy.length === 0) {
            return { passage: '', idea: '', hasDraft: false, title: '', contentMarkdown: '' };
        }

        const instructionMsg = `Analyze our entire conversation above. Extract the following information in strict JSON format:
        {
            "passage": "The primary biblical passage discussed, or empty string if none.",
            "idea": "The central idea, theme, or proposition discussed.",
            "hasDraft": boolean (true if a full sermon draft, manuscript, or highly detailed outline was provided by the assistant AND implicitly or explicitly accepted by the user).,
            "title": "A suggested title for the sermon, based on the discussion.",
            "contentMarkdown": "If hasDraft is true, provide the full sermon content in clean Markdown format (using standard markdown like #, ##, ###, *, -). Do not use HTML tags. If hasDraft is false, leave empty."
        }
        Return ONLY valid JSON. Do not wrap in markdown \`\`\`json blocks. Do not add any conversational text.
        `;

        historyCopy.push({
            role: 'user',
            content: instructionMsg,
            timestamp: new Date()
        });

        try {
            const response = await this.generator.chat(
                WorkflowPhase.PLANNING,
                historyCopy,
                {}
            );

            let cleanJson = response.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.substring(7);
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith('```')) {
                cleanJson = cleanJson.substring(0, cleanJson.length - 3);
            }

            const parsed = JSON.parse(cleanJson.trim());
            const rawContent = parsed.contentMarkdown || '';
            // Strip out AI-generated custom bible links to prevent polluting the editor
            // Handles multiple MDXEditor backslash escaping e.g. \\[📖 Ref\\]\\(#bible-Ref\\)
            const cleanedContent = rawContent.replace(/\\*\[(.*?)\\*\]\\*\(#bible-[^)]+\\*\)/gi, (_, inner) => {
                return inner.replace(/📖\s*/g, "").replace(/\\/g, "").trim();
            });

            return {
                passage: parsed.passage || '',
                idea: parsed.idea || '',
                hasDraft: !!parsed.hasDraft,
                title: parsed.title || '',
                contentMarkdown: cleanedContent
            };
        } catch (error) {
            console.error('Failed to analyze chat:', error);
            throw new Error('Error al analizar la conversación. Intenta de nuevo.');
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
            // Clear Firestore copy too — but only when the current
            // chat key represents a real sermon. Otherwise the
            // permission-denied rule would fire and log noise.
            if (this.wizardChatRepository && this.persistRemote) {
                this.wizardChatRepository
                    .clear(this.currentSermonId, this.currentPhase as SermonWizardChatPhase)
                    .catch((err) => {
                        console.warn('[GeneratorChat] Firestore clear failed', err);
                    });
            }
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

    private contentTypeToWorkflowPhase(contentType: ContentType | 'brainstorming'): WorkflowPhase {
        switch (contentType) {
            case 'brainstorming': return WorkflowPhase.PLANNING;
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

        // Always write to localStorage first — sync, fast, fallback if
        // Firestore is offline. UI sees the persisted snapshot
        // immediately on the next mount even before remote hydration.
        const storage = this.getStorage();
        if (storage) {
            try {
                const key = this.getStorageKey(this.currentSermonId, this.currentPhase);
                storage.setItem(key, JSON.stringify(stored));
            } catch (error) {
                console.warn('⚠️ [GeneratorChat] Failed to save history:', error);
            }
        }

        // Dual-write to Firestore (when wired AND the caller asked for
        // remote persistence). Fire-and-forget — failure logs but does
        // not block the user's next turn. Next successful save
        // reconciles. Skipped entirely for non-sermon chat keys
        // (`persistRemote=false`) since the rule check would
        // deterministically reject the write and just produce log noise.
        if (this.wizardChatRepository && this.persistRemote) {
            const sermonId = this.currentSermonId;
            const phase = this.currentPhase as SermonWizardChatPhase;
            const history: SermonWizardChatHistory = {
                sermonId,
                phase,
                messages: stored.messages.map((m) => ({
                    ...m,
                    timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
                })),
                sourcesPerMessage: stored.sourcesPerMessage as any,
                createdAt: new Date(stored.createdAt),
                updatedAt: new Date(stored.updatedAt),
            };
            this.wizardChatRepository.save(history).catch((err) => {
                console.warn('[GeneratorChat] Firestore save failed; localStorage still has snapshot', err);
            });
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

    /**
     * LA CONVERSACIÓN VIAJA CON EL PASTOR CUANDO EL SERMÓN NACE.
     *
     * En el Paso 1 todavía no hay documento de sermón, así que el chat se guarda
     * bajo una clave provisional (el id de la configuración). En cuanto el
     * pastor genera la exégesis, el sermón se crea y la clave pasa a ser el
     * `sermonId` — y hasta ahora el historial guardado bajo la clave vieja
     * quedaba huérfano: la conversación desaparecía de la pantalla EN ESE MISMO
     * INSTANTE, sin recargar nada, justo cuando el trabajo se ponía serio.
     *
     * Acá se adopta: se mueve el historial a la clave nueva, se vuelve a
     * guardar —lo que además lo sube a Firestore, porque ahora sí hay sermón al
     * que anclarlo, y así sobrevive al cambio de dispositivo— y se borra el
     * rastro viejo para que no reaparezca en un sermón futuro.
     *
     * NUNCA PISA UN HISTORIAL EXISTENTE. Sólo se adopta cuando la clave nueva
     * no tiene nada: si el sermón ya tenía conversación, la suya manda.
     */
    private adoptHistoryFrom(
        adoptFromKey: string | undefined,
        sermonId: string,
        phase: ContentType,
    ): boolean {
        if (!adoptFromKey || adoptFromKey === sermonId) return false;

        const heredado = this.loadHistory(adoptFromKey, phase);
        if (!heredado || heredado.messages.length === 0) return false;

        this.history = heredado.messages;
        this.sourcesPerMessage = new Map(Object.entries(heredado.sourcesPerMessage));
        this.saveHistory();
        this.removeStoredHistory(adoptFromKey, phase);
        return true;
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
