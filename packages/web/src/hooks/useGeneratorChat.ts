import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
    ContentType,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import {
    generatorChatService,
} from '@dosfilos/application';
import { useTranslation } from 'react-i18next';
import { ActiveContext } from '@/components/canvas-chat/ChatInterface';

function resolveActiveLanguage(raw: string | undefined): SupportedLanguage {
    if (!raw) return DEFAULT_LANGUAGE;
    return raw.split('-')[0] === 'en' ? 'en' : 'es';
}

interface UseGeneratorChatProps {
    phase: ContentType;
    content: any;
    config: any;
    user: any;
    /**
     * Sermon id. Drives both the localStorage key and the Firestore
     * persistence path `sermons/{sermonId}/wizard_chats/{phase}`
     * (PR #219). Pre-PR #219 this hook used `config.id` (the
     * WorkflowConfiguration id) as a stand-in, which the firestore.rules
     * `get(/sermons/{sermonId})` ownership check correctly rejects with
     * "Missing or insufficient permissions" — the WorkflowConfiguration
     * id is not a valid sermon document id. Callers inside the wizard
     * (StepExegesis / StepHomiletics / StepDraft) pass `sermonId` from
     * `useWizard()`; the standalone tutor surface has no real sermon
     * and omits this prop, falling back to a session-scoped local key.
     */
    sermonId?: string | null;
    onContentUpdate?: (newContent: any) => void;
    // Legacy props (kept for interface compatibility but unused)
    initialCacheName?: string | null;
    selectedResourceIds?: string[];
    onCacheUpdate?: (cacheName: string) => void;
}

export function useGeneratorChat({
    phase,
    content,
    config,
    sermonId,
}: UseGeneratorChatProps) {
    const { i18n } = useTranslation();
    // Chat State
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize Chat Service
    useEffect(() => {
        // Prefer the real sermon id (wizard callers). Fall back to
        // config.id only for surfaces without a sermon (e.g. standalone
        // tutor) — those skip Firestore (rule check fails silently and
        // the service catches it) and keep chat in localStorage only.
        const chatKey = sermonId ?? config?.id;
        if (chatKey) {
            generatorChatService.initializeForSermon(chatKey, phase);
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
    }, [sermonId, config?.id, phase]);

    // Active Context - Always "Global" now
    const activeContext = useMemo<ActiveContext>(() => {
        return {
            isCached: true, // Pretend it's cached/ready so UI shows green
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Fake 24h expiry
            resources: [{ title: "Biblioteca Central (Global)", author: "Sistema" }],
            totalAvailableResources: 999, // Arbitrary number indicating global scale
            syncedResourceCount: 999,
            expiredResourceCount: 0
        };
    }, []);

    // Refresh Context Handler - No-op for Global Store
    const refreshContext = useCallback(async () => {
        toast.info("Contexto Global activo. No requiere actualización.");
    }, []);

    // Send Message Handler
    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user', expandedSectionId?: string | null) => {
        // Optimistic UI for User
        const userMsgId = Date.now().toString();
        const userTempData = {
            id: userMsgId,
            role,
            content: message,
            timestamp: new Date()
        };

        // Prepare Assistant placeholder
        const assistantMsgId = (Date.now() + 1).toString();
        const assistantTempData = {
            id: assistantMsgId,
            role: 'assistant',
            content: '', // Empty initially for streaming
            timestamp: new Date()
        };

        if (role === 'user') {
            setMessages(prev => [...prev, userTempData, assistantTempData]);
        } else {
            setMessages(prev => [...prev, userTempData]);
            return;
        }

        setIsLoading(true);

        try {
            // Determine generic config based on phase
            let phaseKey: string = 'exegesis';
            if (phase === 'homiletics') phaseKey = 'homiletics';
            if (phase === 'sermon') phaseKey = 'drafting';

            const aiModel = config?.advanced?.aiModel;
            const temperature = config?.[phaseKey]?.temperature || config?.advanced?.globalTemperature;

            const response = await generatorChatService.sendMessageStream(
                message,
                {
                    passage: '',
                    currentContent: content,
                    focusedSection: expandedSectionId || null,
                    libraryResources: [],
                    phaseResources: [],
                    cacheName: undefined,
                    aiModel,
                    temperature,
                    language: resolveActiveLanguage(i18n.language),
                },
                (chunk: string) => {
                    // Update the specific assistant message as chunks arrive
                    setMessages(prev => prev.map(msg =>
                        msg.id === assistantMsgId
                            ? { ...msg, content: chunk }
                            : msg
                    ));
                }
            );

            // Final update with sources and strategy
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: response.content,
                        sources: response.sources,
                        strategyUsed: response.strategyUsed
                    }
                    : msg
            ));

        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? { ...msg, content: `Error: ${error.message || 'Ocurrió un error inesperado'}` }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    // No-ops for legacy features
    const syncDocuments = useCallback(async () => Promise.resolve(), []);
    const ensureContextReady = useCallback(async () => true, []);

    return {
        messages,
        setMessages,
        isLoading,
        activeContext,
        refreshContext,
        handleSendMessage,
        libraryResources: [], // Empty for components
        cacheName: null,
        syncDocuments,
        isSyncingDocuments: false,
        ensureContextReady
    };
}
