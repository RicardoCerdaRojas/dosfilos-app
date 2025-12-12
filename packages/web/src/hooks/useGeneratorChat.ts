import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
    ContentType,
    WorkflowPhase,
    LibraryResourceEntity
} from '@dosfilos/domain';
import {
    generatorChatService,
    sermonGeneratorService,
    libraryService
} from '@dosfilos/application';
import { ActiveContext } from '@/components/canvas-chat/ChatInterface';

interface UseGeneratorChatProps {
    phase: ContentType;
    content: any;
    config: any;
    user: any;
    onContentUpdate?: (newContent: any) => void;
    initialCacheName?: string | null;
    selectedResourceIds?: string[];
    onCacheUpdate?: (cacheName: string) => void;
}

export function useGeneratorChat({
    phase,
    content,
    config,
    user,
    onContentUpdate,
    initialCacheName = null,
    selectedResourceIds = [],
    onCacheUpdate
}: UseGeneratorChatProps) {
    // Chat State
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Context State
    const [cacheName, setCacheName] = useState<string | null>(initialCacheName);
    const [cacheMetadata, setCacheMetadata] = useState<{
        createdAt: Date;
        resources: Array<{ title: string; author: string }>;
    } | null>(null);
    const [hydratedResources, setHydratedResources] = useState<LibraryResourceEntity[]>([]);

    // 🎯 FIX: Track last attempted hydration to prevent infinite loop
    const lastAttemptedIdsRef = useRef<string>('');

    // Initialize Chat Service
    useEffect(() => {
        if (config?.id) {
            generatorChatService.initializeForSermon(config.id, phase);
            const history = generatorChatService.getHistory();
            if (history.length > 0) {
                setMessages(history.map((m, idx) => ({
                    id: `restored_${idx}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                    sources: (generatorChatService as any).getSourcesForMessage ? (generatorChatService as any).getSourcesForMessage(idx) : undefined
                })));
            }
        }
    }, [config?.id, phase]);

    // 🎯 NEW: Restore cache from localStorage on MOUNT (independent of initialCacheName)
    useEffect(() => {
        if (!user?.uid) return;

        const key = `dosfilos_cache_${user.uid}_${phase}`;

        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.cacheName && parsed?.metadata) {
                    console.log(`♻️ [useGeneratorChat] Restoring cache from localStorage on mount: ${parsed.cacheName}`);

                    setCacheName(parsed.cacheName);
                    setCacheMetadata({
                        ...parsed.metadata,
                        createdAt: new Date(parsed.metadata.createdAt)
                    });

                    // Notify parent if callback exists
                    onCacheUpdate?.(parsed.cacheName);
                }
            }
        } catch (e) {
            console.error("Error restoring cache on mount:", e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run ONLY on mount

    // Update local cacheName if prop changes (source of truth is WizardContext usually)
    useEffect(() => {
        if (initialCacheName !== undefined && initialCacheName !== cacheName) {
            setCacheName(initialCacheName);
        }
    }, [initialCacheName]);

    // Hydrate Resources for RAG fallback
    useEffect(() => {
        const hydrateResources = async () => {
            console.log(`🔍 [useGeneratorChat] Hydration check - Phase: ${phase}, User: ${user?.uid ? 'YES' : 'NO'}, Config: ${config ? 'YES' : 'NO'}`);

            if (!config || !user?.uid) {
                console.log(`⏭️ [useGeneratorChat] Skipping hydration - missing ${!config ? 'config' : 'user'}`);
                return;
            }

            // Determine active resource IDs
            const phaseConfig = config[getWorkflowPhase(phase)];

            // 🎯 FIX: Check length before falling back to avoid empty array blocking libraryDocIds
            const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
            const libIds = phaseConfig?.libraryDocIds || [];
            const configDocIds = docsIds.length > 0 ? docsIds : libIds;

            console.log(`📋 [useGeneratorChat] Phase config for ${phase}:`, {
                hasDocuments: !!phaseConfig?.documents,
                documentsLength: phaseConfig?.documents?.length || 0,
                hasLibraryDocIds: !!phaseConfig?.libraryDocIds,
                libraryDocIdsLength: phaseConfig?.libraryDocIds?.length || 0,
                configDocIds,
                source: docsIds.length > 0 ? 'documents' : 'libraryDocIds'
            });

            const activeIds = selectedResourceIds.length > 0
                ? selectedResourceIds
                : configDocIds;

            if (activeIds.length === 0) {
                console.log(`⏭️ [useGeneratorChat] No resource IDs to hydrate`);

                // Clear hydrated resources if we have none configured
                if (hydratedResources.length > 0) {
                    setHydratedResources([]);
                }
                lastAttemptedIdsRef.current = '';
                return;
            }

            // 🎯 GUARD: Prevent infinite loop - skip if we already attempted these exact IDs
            const targetIdsKey = [...activeIds].sort().join(',');

            if (lastAttemptedIdsRef.current === targetIdsKey) {
                console.log(`⏭️ [useGeneratorChat] Already attempted hydration for these IDs, skipping`);
                return;
            }

            // Mark these IDs as attempted BEFORE starting hydration
            lastAttemptedIdsRef.current = targetIdsKey;
            console.log(`💧 [useGeneratorChat] Starting hydration for ${activeIds.length} resources:`, activeIds);

            try {
                // Method 1: Bulk Fetch from local user cache
                const userLib = await libraryService.getUserResources(user.uid);
                console.log(`📚 [useGeneratorChat] User library has ${userLib.length} total resources`);

                let resources = activeIds.map((id: string) =>
                    userLib.find((r: any) => r.id === id)
                ).filter(Boolean);

                console.log(`✅ [useGeneratorChat] Found ${resources.length}/${activeIds.length} resources in bulk fetch`);

                // Method 2: Fallback - Fetch individually if missing (e.g. stale list)
                if (resources.length < activeIds.length) {
                    const missingIds = activeIds.filter((id: string) => !resources.find((r: any) => r?.id === id));
                    console.log(`⚠️ [useGeneratorChat] Fetching ${missingIds.length} missing resources individually:`, missingIds);

                    const extraResources = await Promise.all(
                        missingIds.map((id: string) => libraryService.getResource(id).catch(() => null))
                    );

                    const foundExtra = extraResources.filter(Boolean);
                    console.log(`✅ [useGeneratorChat] Found ${foundExtra.length}/${missingIds.length} via individual fetch`);

                    resources = [...resources, ...foundExtra];
                }

                const finalResources = resources.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    author: r.author,
                    type: r.type,
                    metadata: r.metadata,
                    textExtractionStatus: r.textExtractionStatus
                }));

                console.log(`🎉 [useGeneratorChat] Hydration complete - ${finalResources.length} resources ready`);
                setHydratedResources(finalResources);
            } catch (error) {
                console.error('❌ [useGeneratorChat] Error hydrating resources:', error);
            }
        };

        hydrateResources();
    }, [config, user?.uid, selectedResourceIds, phase]);

    // Active Context Calculation (Cache > RAG)
    const activeContext = useMemo<ActiveContext>(() => {
        const workflowPhase = getWorkflowPhase(phase);
        const phaseConfig = config?.[workflowPhase];

        // 🎯 FIX: Check length before falling back
        const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
        const libIds = phaseConfig?.libraryDocIds || [];
        const totalDocs = docsIds.length > 0 ? docsIds.length : libIds.length;

        // 1. Cache (Priority)
        if (cacheName && cacheMetadata) {
            return {
                isCached: true,
                lastRefresh: cacheMetadata.createdAt,
                resources: cacheMetadata.resources,
                totalAvailableResources: totalDocs
            };
        }

        // 2. Direct RAG (Hydrated Resources)
        if (hydratedResources.length > 0) {
            return {
                isCached: false,
                resources: hydratedResources.map(r => ({ title: r.title, author: r.author })),
                totalAvailableResources: totalDocs
            };
        }

        // 3. Fallback / Empty
        return {
            isCached: false,
            resources: [],
            totalAvailableResources: totalDocs
        };
    }, [cacheName, cacheMetadata, hydratedResources, config, phase]);

    // Persistence: Save/Load Cache Metadata from LocalStorage
    useEffect(() => {
        if (!user?.uid) return;
        // Generate a unique storage key for this specific phase and user
        // This ensures Exegesis cache is distinct from Homiletics cache
        const key = `dosfilos_cache_${user.uid}_${phase}`;

        // Save
        if (cacheName && cacheMetadata) {
            localStorage.setItem(key, JSON.stringify({ cacheName, metadata: cacheMetadata }));
        } else if (!cacheName) {
            // Only clear if we explicitly know it's gone? 
            // Better to not clear aggressively if we are just switching steps.
            // But if null is passed, maybe we should.
        }

        // Load (only if missing metadata)
        if (cacheName && !cacheMetadata) {
            try {
                const saved = JSON.parse(localStorage.getItem(key) || 'null');
                if (saved && saved.cacheName && saved.metadata) {
                    // Trust LS if newer or matching (sync fix)
                    if (saved.cacheName === cacheName || saved.cacheName !== cacheName) {
                        // Note: In StepHomiletics we allowed overwrite of cacheName. 
                        // Here we should be careful. 
                        // If the prop `initialCacheName` is stale, we might want to notify parent.
                        // For now, let's just hydrate metadata if names match OR just update local state.

                        const hydrated = {
                            ...saved.metadata,
                            createdAt: new Date(saved.metadata.createdAt)
                        };

                        if (saved.cacheName !== cacheName) {
                            console.log(`♻️ [useGeneratorChat] Restoring newer cache from LS: ${saved.cacheName}`);
                            setCacheName(saved.cacheName); // Local update
                            onCacheUpdate?.(saved.cacheName); // Notify parent
                        }

                        setCacheMetadata(hydrated);
                    }
                }
            } catch (e) {
                console.error("Error restoring cache metadata", e);
            }
        }
    }, [cacheName, cacheMetadata, user?.uid, phase, onCacheUpdate]);


    // Refresh Context Handler
    const refreshContext = useCallback(async () => {
        try {
            toast.loading('Regenerando contexto (Cache)...');

            const workflowPhase = getWorkflowPhase(phase);
            const phaseConfig = config?.[workflowPhase];

            // 🎯 FIX: Check length before falling back
            const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
            const libIds = phaseConfig?.libraryDocIds || [];
            const configDocIds = docsIds.length > 0 ? docsIds : libIds;

            const effectiveResourceIds = selectedResourceIds.length > 0
                ? selectedResourceIds
                : configDocIds;

            const refreshConfig = {
                ...phaseConfig,
                libraryDocIds: effectiveResourceIds
            };

            // 🎯 NEW: Guard clause - If no resources, don't call service, just clear cache
            if (effectiveResourceIds.length === 0) {
                setCacheName(null);
                setCacheMetadata(null);
                setMessages([]);
                if (config?.id) generatorChatService.clearHistory();

                toast.dismiss();
                toast.info('Contexto actualizado (Sin recursos seleccionados)');
                return;
            }

            // Call service
            const result = await sermonGeneratorService.refreshContext(refreshConfig);

            if (result.cacheName) {
                setCacheName(result.cacheName);
                onCacheUpdate?.(result.cacheName);

                // Update Metadata
                const newMetadata = {
                    createdAt: new Date(),
                    resources: result.cachedResources || hydratedResources.map(r => ({ title: r.title, author: r.author }))
                };
                setCacheMetadata(newMetadata);

                // Clear chat history
                setMessages([]);
                if (config?.id) generatorChatService.clearHistory();

                toast.dismiss();
                toast.success(`Contexto regenerado con ${newMetadata.resources.length} recursos`);
            } else {
                toast.dismiss();
                toast.info(`Contexto actualizado (Sin Caché - Modo Directo)`);
            }
        } catch (error: any) {
            console.error('Error refreshing context:', error);
            toast.dismiss();
            toast.error('Error al regenerar contexto');
        }
    }, [config, selectedResourceIds, phase, hydratedResources, onCacheUpdate]);


    // Send Message Handler
    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user', expandedSectionId?: string | null) => {
        // Optimistic UI
        const tempData = {
            id: Date.now().toString(),
            role,
            content: message,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, tempData]);

        if (role === 'assistant') return; // Just adding a system notification or manual assistant msg

        setIsLoading(true);

        try {
            // CASE 1: General Chat (No section)
            if (!expandedSectionId) {
                const workflowPhase = getWorkflowPhase(phase);
                const response = await generatorChatService.sendMessage(message, {
                    passage: getPassageFromContent(content, phase),
                    currentContent: content,
                    focusedSection: null,
                    libraryResources: hydratedResources,
                    phaseResources: config?.[workflowPhase]?.documents || [],
                    cacheName: cacheName || undefined
                });

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date(),
                    sources: response.sources,
                    strategyUsed: response.strategyUsed
                }]);
            }
            // CASE 2: Section Refinement
            // Ideally this should use a Service, but for now we can delegate to the caller 
            // or implement the same logic here.
            // For cleaner architecture, we expose a "refiner" or let the component handle section refinement calls
            // because `onContentUpdate` might require complex path mapping.
            // BUT the user asked for "same component".
            // Let's allow the hook to handle "General Chat" natively.
            // For refinement, we can provide a helper or just return the state.

            // To truly unify, we should handle refinement here too.
            // I'll leave refinement logic to the component for this iteration to avoid breaking the complex parsing logic 
            // inside StepHomiletics/StepDraft until I can abstract it properly.
            // I will return `isLoading` so component can block.

        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${error.message || 'Ocurrió un error inesperado'}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        setMessages,
        isLoading,
        activeContext,
        refreshContext,
        handleSendMessage,
        // Expose resources for components that need manual refinement logic
        libraryResources: hydratedResources,
        cacheName
    };
}

// Helper
function getWorkflowPhase(contentType: ContentType): WorkflowPhase {
    switch (contentType) {
        case 'exegesis': return WorkflowPhase.EXEGESIS;
        case 'homiletics': return WorkflowPhase.HOMILETICS;
        case 'sermon': return WorkflowPhase.DRAFTING;
        default: return WorkflowPhase.EXEGESIS;
    }
}

function getPassageFromContent(content: any, type: ContentType): string {
    if (!content) return '';
    if (type === 'exegesis') return content.passage || '';
    if (type === 'homiletics') return content.exegeticalStudy?.passage || '';
    if (type === 'sermon') return ''; // Draft usually doesn't store passage directly at top level?
    return '';
}
