import { useState, useEffect, useCallback } from 'react';
import { WorkflowPhase, ContentType, CoachingStyle, DEFAULT_LANGUAGE } from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { sermonGeneratorService, generatorChatService } from '@dosfilos/application';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLibrary } from '@/hooks/library';

function resolveActiveLanguage(raw: string | undefined): SupportedLanguage {
    if (!raw) return DEFAULT_LANGUAGE;
    return raw.split('-')[0] === 'en' ? 'en' : 'es';
}

export interface UseSermonStepChatProps {
    phase: WorkflowPhase;
    contentType: ContentType;
    configId?: string;
    passage: string;
    currentContent: any;
    onContentUpdate: (content: any) => void;
    userId?: string;
    config?: any;
    selectedResourceIds?: string[];
    cacheName?: string | null;
    setCacheName?: (name: string | null) => void;
}

export interface ActiveContext {
    isCached: boolean;
    createdAt?: Date | null;
    expiresAt?: Date | null;
    resources: Array<{ title: string; author: string }>;
}

/**
 * Custom hook that manages all chat-related functionality for sermon generation steps
 * Handles: cache management, library resources, message history, context validation, etc.
 */
export function useSermonStepChat({
    phase,
    contentType,
    configId,
    passage,
    currentContent,
    onContentUpdate,
    userId,
    config,
    selectedResourceIds = [],
    cacheName: externalCacheName,
    setCacheName: externalSetCacheName
}: UseSermonStepChatProps) {
    const { i18n } = useTranslation();
    const [messages, setMessages] = useState<any[]>([]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    const { resources: libraryResources } = useLibrary();
    const [lastContextRefresh, setLastContextRefresh] = useState<Date | null>(null);

    // Use external cacheName if provided, otherwise manage internally
    const [internalCacheName, setInternalCacheName] = useState<string | null>(null);
    const cacheName = externalCacheName !== undefined ? externalCacheName : internalCacheName;
    const setCacheName = externalSetCacheName || setInternalCacheName;

    // Initialize chat service when config is available
    useEffect(() => {
        if (configId) {
            generatorChatService.initializeForSermon(configId, contentType);
            const history = generatorChatService.getHistory();
            if (history.length > 0) {
                setMessages(history.map((m, idx) => ({
                    id: `restored_${idx}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp
                })));
            }
        }
    }, [configId, contentType]);

    // Set coaching style
    useEffect(() => {
        generatorChatService.setCoachingStyle(selectedStyle);
    }, [selectedStyle]);

    // Calculate effective resource IDs
    const getEffectiveResourceIds = useCallback(() => {
        return selectedResourceIds.length > 0
            ? selectedResourceIds
            : (config?.[phase]?.libraryDocIds?.length
                ? config[phase].libraryDocIds
                : (config?.[phase]?.documents?.length
                    ? config[phase].documents.map((d: any) => d.id)
                    : libraryResources.map(r => r.id)));
    }, [selectedResourceIds, config, phase, libraryResources]);

    // Get effective resources
    const getEffectiveResources = useCallback(() => {
        const effectiveResourceIds = getEffectiveResourceIds();
        return libraryResources.filter(r => effectiveResourceIds.includes(r.id));
    }, [getEffectiveResourceIds, libraryResources]);

    // Build active context for ChatInterface
    const activeContext: ActiveContext = {
        isCached: !!cacheName,
        createdAt: lastContextRefresh,
        expiresAt: lastContextRefresh ? new Date(lastContextRefresh.getTime() + 3600000) : null, // 1 hour TTL
        resources: getEffectiveResources().map(r => ({ title: r.title, author: r.author }))
    };

    // Refresh context (regenerate cache)
    const handleRefreshContext = useCallback(async () => {
        try {
            toast.loading('Regenerando contexto (Cache)...');

            const effectiveResourceIds = getEffectiveResourceIds();
            const refreshConfig = {
                ...config?.[phase],
                libraryDocIds: effectiveResourceIds
            };

            const result = await sermonGeneratorService.refreshContext(refreshConfig as any);

            if (result.cacheName) {
                setCacheName(result.cacheName);
                setLastContextRefresh(new Date());
                setMessages([]);

                const cachedCount = result.cachedResources?.length || 0;
                toast.dismiss();
                toast.success(`Contexto regenerado con ${cachedCount} recurso(s)`);
            } else {
                toast.dismiss();
                toast.info(`Contexto actualizado con ${effectiveResourceIds.length} recurso(s) (Sin caché)`);
            }
        } catch (error: any) {
            console.error('Error refreshing context:', error);
            toast.dismiss();
            toast.error('Error al regenerar contexto');
        }
    }, [config, phase, getEffectiveResourceIds, setCacheName]);

    // Send message handler
    const handleSendMessage = useCallback(async (message: string, role: 'user' | 'assistant' = 'user') => {
        const newMessage = {
            id: Date.now().toString(),
            role,
            content: message,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);

        // Context Validation for user messages
        if (role === 'user') {
            setIsAiProcessing(true);
            try {
                const { GeminiAIService } = await import('@dosfilos/infrastructure');

                // Sin gate de clave: `GeminiAIService` habla con el callable
                // del servidor. El `throw` de antes era un interruptor — el día
                // que se borre la variable habría matado el refinamiento con un
                // error que suena a configuración faltante, no a regresión.
                const aiService = new GeminiAIService();

                // Build library resources context for validator
                const availableResources = getEffectiveResources()
                    .map(r => `${r.title} (${r.author})`)
                    .join(', ');

                const libraryContext = availableResources
                    ? `\n\nRecursos disponibles en biblioteca: ${availableResources}`
                    : '';

                const enhancedContext = libraryContext;

                const validation = await aiService.validateContext(message, enhancedContext);

                if (!validation.isValid) {
                    const refusalMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: validation.refusalMessage || "Entiendo tu mensaje, pero como experto en este tema, mi enfoque está en ayudarte a profundizar en el estudio. ¿Podrías reformular tu solicitud?",
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, refusalMessage]);
                    setIsAiProcessing(false);
                    return;
                }
            } catch (error) {
                console.error('Error in context validation:', error);
            }
        }

        // Call GeneratorChatService
        if (role === 'user') {
            try {
                const phaseConfig = config ? config[phase] : undefined;
                const phaseResources = phaseConfig?.documents || [];
                const effectiveResources = getEffectiveResources();

                const response = await generatorChatService.sendMessage(message, {
                    passage,
                    currentContent,
                    focusedSection: null,
                    libraryResources: effectiveResources,
                    phaseResources: phaseResources as any,
                    cacheName: cacheName || undefined,
                    language: resolveActiveLanguage(i18n.language),
                });

                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: response.content,
                    timestamp: new Date(),
                    sources: response.sources,
                    strategyUsed: response.strategyUsed
                };
                setMessages(prev => [...prev, aiMessage]);

            } catch (error: any) {
                console.error('Error in chat:', error);
                const errorMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: `Error: ${error.message || 'No se pudo procesar la solicitud'}`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setIsAiProcessing(false);
            }
        }
    }, [passage, currentContent, config, phase, cacheName, getEffectiveResources]);

    // Clear chat history
    const clearMessages = useCallback(() => {
        setMessages([]);
        generatorChatService.clearHistory();
    }, []);

    return {
        // State
        messages,
        isAiProcessing,
        selectedStyle,
        libraryResources,
        cacheName,
        lastContextRefresh,
        activeContext,

        // Setters
        setMessages,
        setSelectedStyle,
        setCacheName,

        // Handlers
        handleSendMessage,
        handleRefreshContext,
        clearMessages,

        // Utilities
        getEffectiveResourceIds,
        getEffectiveResources
    };
}
