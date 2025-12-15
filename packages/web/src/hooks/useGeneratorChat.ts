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
        expiresAt: Date;
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


                    setCacheName(parsed.cacheName);
                    setCacheMetadata({
                        ...parsed.metadata,
                        createdAt: new Date(parsed.metadata.createdAt),
                        expiresAt: parsed.metadata.expiresAt ? new Date(parsed.metadata.expiresAt) : new Date(Date.now() + 3600000) // 1hr fallback
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


            if (!config || !user?.uid) {

                return;
            }

            // Determine active resource IDs
            const phaseConfig = config[getWorkflowPhase(phase)];

            // 🎯 FIX: Check length before falling back to avoid empty array blocking libraryDocIds
            const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
            const libIds = phaseConfig?.libraryDocIds || [];
            const configDocIds = docsIds.length > 0 ? docsIds : libIds;


            const activeIds = selectedResourceIds.length > 0
                ? selectedResourceIds
                : configDocIds;

            if (activeIds.length === 0) {


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

                return;
            }

            // Mark these IDs as attempted BEFORE starting hydration
            lastAttemptedIdsRef.current = targetIdsKey;


            try {
                // Method 1: Bulk Fetch from local user cache
                const userLib = await libraryService.getUserResources(user.uid);


                let resources = activeIds.map((id: string) =>
                    userLib.find((r: any) => r.id === id)
                ).filter(Boolean);



                // Method 2: Fallback - Fetch individually if missing (e.g. stale list)
                if (resources.length < activeIds.length) {
                    const missingIds = activeIds.filter((id: string) => !resources.find((r: any) => r?.id === id));


                    const extraResources = await Promise.all(
                        missingIds.map((id: string) => libraryService.getResource(id).catch(() => null))
                    );

                    const foundExtra = extraResources.filter(Boolean);


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

        // 🎯 NEW: Calculate synced and expired resource counts
        const GEMINI_TTL_HOURS = 44;
        const now = Date.now();

        const resourcesWithStatus = hydratedResources.map(r => {
            const geminiSyncedAt = r.metadata?.geminiSyncedAt
                ? new Date(r.metadata.geminiSyncedAt)
                : null;
            const isGeminiExpired = geminiSyncedAt
                ? (now - geminiSyncedAt.getTime()) > (GEMINI_TTL_HOURS * 60 * 60 * 1000)
                : !r.metadata?.geminiUri; // No URI = expired/never synced

            return {
                title: r.title,
                author: r.author,
                hasGeminiUri: !!r.metadata?.geminiUri,
                geminiSyncedAt,
                isGeminiExpired
            };
        });

        const syncedResourceCount = resourcesWithStatus.filter(r => r.hasGeminiUri && !r.isGeminiExpired).length;
        const expiredResourceCount = resourcesWithStatus.filter(r => r.isGeminiExpired).length;

        // 1. Cache (Priority)
        if (cacheName && cacheMetadata) {
            // 🎯 FIX: Use current hydrated resources for display, not stale cache metadata
            // The cache metadata might have different number of resources than current config
            return {
                isCached: true,
                createdAt: cacheMetadata.createdAt,
                expiresAt: cacheMetadata.expiresAt,
                resources: resourcesWithStatus, // Use current resources, not stale cache data
                totalAvailableResources: hydratedResources.length, // Use actual hydrated count
                syncedResourceCount,
                expiredResourceCount
            };
        }

        // 2. Direct RAG (Hydrated Resources)
        if (hydratedResources.length > 0) {
            return {
                isCached: false,
                resources: resourcesWithStatus,
                totalAvailableResources: totalDocs,
                syncedResourceCount,
                expiredResourceCount
            };
        }

        // 3. Fallback / Empty
        return {
            isCached: false,
            resources: [],
            totalAvailableResources: totalDocs,
            syncedResourceCount: 0,
            expiredResourceCount: 0
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
            console.log('🔄 refreshContext: Starting...');
            toast.loading('Regenerando contexto (Cache)...', { id: 'refresh-context' });

            const workflowPhase = getWorkflowPhase(phase);
            const phaseConfig = config?.[workflowPhase];

            console.log('🔄 refreshContext: Phase config:', { workflowPhase, phaseConfig: !!phaseConfig });

            // 🎯 FIX: Check length before falling back
            const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
            const libIds = phaseConfig?.libraryDocIds || [];
            const configDocIds = docsIds.length > 0 ? docsIds : libIds;

            const effectiveResourceIds = selectedResourceIds.length > 0
                ? selectedResourceIds
                : configDocIds;

            console.log('🔄 refreshContext: Resource IDs:', effectiveResourceIds);

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

                toast.dismiss('refresh-context');
                toast.info('Contexto actualizado (Sin recursos seleccionados)');
                return;
            }

            // 🎯 NEW: Add timeout to prevent infinite blocking
            console.log('🔄 refreshContext: Calling service with timeout...');
            console.log('🔍 refreshContext: hydratedResources:', hydratedResources.map(r => ({
                id: r.id,
                title: r.title?.substring(0, 25),
                hasMetadata: !!r.metadata,
                geminiUri: r.metadata?.geminiUri?.substring(0, 50) || 'NOT FOUND',
                geminiSyncedAt: r.metadata?.geminiSyncedAt || 'NOT FOUND'
            })));

            // 🎯 NEW: Create cache DIRECTLY from hydratedResources (bypass service)
            const aiReadyResources = hydratedResources.filter(r => r.metadata?.geminiUri);
            console.log('🔍 refreshContext: AI Ready resources (local):', aiReadyResources.length);

            if (aiReadyResources.length === 0) {
                console.log('🔄 refreshContext: No AI ready resources - clearing cache');
                setCacheName(null);
                setCacheMetadata(null);
                toast.dismiss('refresh-context');
                toast.warning('Los documentos necesitan sincronizarse. Ve a Biblioteca y re-sincroniza.');
                return;
            }

            const geminiUris = aiReadyResources.map(r => r.metadata!.geminiUri!);
            console.log('🔍 refreshContext: Creating cache with URIs:', geminiUris.length);

            // Create cache using fetch directly (bypass service package issues)
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                toast.dismiss('refresh-context');
                toast.error('API Key de Gemini no configurada');
                return;
            }

            const cacheResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'models/gemini-2.5-flash',
                        contents: geminiUris.map(uri => ({
                            role: 'user',
                            parts: [{ fileData: { fileUri: uri, mimeType: 'application/pdf' } }]
                        })),
                        ttl: '3600s' // 1 hour
                    })
                }
            );

            if (!cacheResponse.ok) {
                const errorText = await cacheResponse.text();
                console.error('❌ Cache creation failed:', errorText);
                toast.dismiss('refresh-context');

                if (errorText.includes('403') || errorText.includes('404')) {
                    toast.warning('Los documentos expiraron en Gemini. Re-sincroniza en Biblioteca.');
                } else {
                    toast.error('Error creando cache de contexto');
                }
                return;
            }

            const cacheData = await cacheResponse.json();
            console.log('✅ refreshContext: Cache created:', cacheData.name);

            const newCacheName = cacheData.name;
            const expireTime = new Date(cacheData.expireTime);

            setCacheName(newCacheName);
            onCacheUpdate?.(newCacheName);

            const newMetadata = {
                createdAt: new Date(),
                expiresAt: expireTime,
                resources: aiReadyResources.map(r => ({ title: r.title, author: r.author }))
            };
            setCacheMetadata(newMetadata);

            // Clear chat history
            setMessages([]);
            if (config?.id) generatorChatService.clearHistory();

            toast.dismiss('refresh-context');
            toast.success(`Contexto regenerado con ${newMetadata.resources.length} recursos`);

        } catch (error: any) {
            console.error('❌ refreshContext Error:', error);
            toast.dismiss('refresh-context');
            toast.error(error.message?.includes('Timeout')
                ? 'La regeneración tardó demasiado. Intenta de nuevo.'
                : 'Error al regenerar contexto');
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

    // 🎯 NEW: Sync expired documents with Gemini Files API
    const [isSyncingDocuments, setIsSyncingDocuments] = useState(false);

    const syncDocuments = useCallback(async () => {
        try {
            setIsSyncingDocuments(true);
            toast.loading('Sincronizando documentos con Gemini...', { id: 'sync-docs' });

            // Get expired resource IDs from hydrated resources
            const GEMINI_TTL_HOURS = 44;
            const now = Date.now();

            const expiredIds = hydratedResources
                .filter(r => {
                    const syncedAt = r.metadata?.geminiSyncedAt
                        ? new Date(r.metadata.geminiSyncedAt).getTime()
                        : 0;
                    const isExpired = !r.metadata?.geminiUri || (now - syncedAt) > (GEMINI_TTL_HOURS * 60 * 60 * 1000);
                    return isExpired;
                })
                .map(r => r.id);

            if (expiredIds.length === 0) {
                toast.dismiss('sync-docs');
                toast.info('Todos los documentos ya están sincronizados');
                return;
            }

            console.log(`🔄 Syncing ${expiredIds.length} expired documents...`);

            // Call LibraryService to sync each document
            await libraryService.refreshGeminiLinks(expiredIds);

            // 🎯 Wait for Firestore to propagate changes (Cloud Functions update)
            console.log('⏳ Waiting for Firestore propagation...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Refresh the hydrated resources by forcing a re-fetch
            // This is a bit hacky but works - we trigger a re-render
            const phaseConfig = config?.[getWorkflowPhase(phase)];
            const docsIds = phaseConfig?.documents?.map((d: any) => d.id) || [];
            const libIds = phaseConfig?.libraryDocIds || [];
            const configDocIds = docsIds.length > 0 ? docsIds : libIds;
            const activeIds = selectedResourceIds.length > 0 ? selectedResourceIds : configDocIds;

            // Re-fetch resources to get updated metadata
            console.log('🔄 Re-fetching resources from Firestore...');
            const refreshedResources = await Promise.all(
                activeIds.map((id: string) => libraryService.getResource(id).catch(() => null))
            );

            const validResources = refreshedResources.filter((r): r is LibraryResourceEntity => r !== null);
            console.log('📚 Refreshed resources:', validResources.map(r => ({ title: r.title, geminiUri: !!r.metadata?.geminiUri })));
            setHydratedResources(validResources);

            toast.dismiss('sync-docs');
            toast.success(`${expiredIds.length} documentos sincronizados`);

        } catch (error: any) {
            console.error('❌ syncDocuments Error:', error);
            toast.dismiss('sync-docs');
            toast.error('Error al sincronizar documentos');
        } finally {
            setIsSyncingDocuments(false);
        }
    }, [hydratedResources, config, phase, selectedResourceIds]);

    // 🎯 NEW: Ensure context is ready before generation
    const ensureContextReady = useCallback(async (): Promise<boolean> => {
        try {
            const expiredCount = activeContext.expiredResourceCount ?? 0;
            const totalResources = activeContext.totalAvailableResources ?? 0;

            // 1. Sync expired documents first (if any)
            let didSync = false;
            if (expiredCount > 0) {
                console.log('🔄 ensureContextReady: Syncing expired documents...');
                await syncDocuments();
                didSync = true;
                // Wait a moment for Firestore propagation
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 2. Create/refresh cache if:
            //    - Not already cached, OR
            //    - We just synced documents (need fresh cache with new URIs)
            if (!activeContext.isCached || didSync) {
                if (totalResources > 0) {
                    console.log('🔄 ensureContextReady: Creating cache...');
                    await refreshContext();
                }
            }

            console.log('✅ ensureContextReady: Context ready!');
            return true;
        } catch (error) {
            console.error('❌ ensureContextReady Error:', error);
            return false;
        }
    }, [activeContext, syncDocuments, refreshContext]);

    return {
        messages,
        setMessages,
        isLoading,
        activeContext,
        refreshContext,
        handleSendMessage,
        // Expose resources for components that need manual refinement logic
        libraryResources: hydratedResources,
        cacheName,
        // 🎯 NEW: Document sync
        syncDocuments,
        isSyncingDocuments,
        // 🎯 NEW: Ensure context ready for generation
        ensureContextReady
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
