import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facultyService, type ApprovedSermonOutline } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { AIAgent, SermonPersonalization } from '@dosfilos/domain';

import { useState } from 'react';

export function useFacultyChat(sessionId: string) {
    const { user } = useFirebase();
    const queryClient = useQueryClient();
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeAgents, setActiveAgents] = useState<AIAgent[]>([]);

    // Fetch the specific session details (messages)
    const sessionQuery = useQuery({
        queryKey: ['faculty', 'sessions', user?.uid, sessionId],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            const sessions = await facultyService.getHistory.execute(user.uid);
            return sessions.find(s => s.id === sessionId) || null;
        },
        enabled: !!user?.uid && !!sessionId,
    });

    // Direct message to the session's assigned agent (original behaviour)
    const sendMessageMutation = useMutation({
        mutationFn: async ({ message, lengthPreference }: { message: string, lengthPreference?: 'concise' | 'detailed' }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!sessionQuery.data) throw new Error('Session not found');

            setIsStreaming(true);
            setStreamingMessage('');

            try {
                const response = await facultyService.sendMessage.execute(
                    user.uid,
                    sessionId,
                    message,
                    (chunk) => { setStreamingMessage((prev) => prev + chunk); },
                    lengthPreference
                );
                return response;
            } finally {
                setIsStreaming(false);
                setStreamingMessage('');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid, sessionId] });
        }
    });

    // Orchestrated message — router picks the best specialist automatically
    const sendOrchestratedMessageMutation = useMutation({
        mutationFn: async ({ message, lengthPreference }: { message: string, lengthPreference?: 'concise' | 'detailed' }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!sessionQuery.data) throw new Error('Session not found');

            setIsStreaming(true);
            setStreamingMessage('');
            setActiveAgents([]);

            try {
                const { response } = await facultyService.orchestratedMessage.execute(
                    user.uid,
                    sessionId,
                    message,
                    (chunk) => { setStreamingMessage((prev) => prev + chunk); },
                    (agents) => { setActiveAgents(agents); },
                    lengthPreference
                );
                return response;
            } finally {
                setIsStreaming(false);
                setStreamingMessage('');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid, sessionId] });
        }
    });

    const deleteMessageMutation = useMutation({
        mutationFn: async (messageId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.deleteMessage.execute(user.uid, sessionId, messageId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid, sessionId] });
        }
    });

    const extractContentMutation = useMutation({
        mutationFn: async ({ type, approvedOutline, personalization, onChunk }: { type: 'SERMON' | 'SERMON_OUTLINE' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER'; approvedOutline?: ApprovedSermonOutline; personalization?: SermonPersonalization; onChunk?: (chunk: string) => void }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.extractContent.execute(user.uid, sessionId, type, approvedOutline, personalization, onChunk);
        }
    });

    const processMicroActionMutation = useMutation({
        mutationFn: async ({ selectedText, actionType, documentContext, customPrompt, onChunk }: { selectedText: string; actionType: 'REWRITE' | 'EXPAND' | 'SUMMARIZE' | 'BULLET_POINTS' | 'QUOTE_SEARCH' | 'MAKE_ACADEMIC' | 'MAKE_PASTORAL' | 'CUSTOM'; documentContext?: string; customPrompt?: string; onChunk?: (chunk: string) => void }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.processMicroAction.execute({
                userId: user.uid,
                sessionId,
                selectedText,
                actionType,
                documentContext,
                customPrompt,
                onChunk
            });
        }
    });

    return {
        session: sessionQuery.data,
        isLoadingSession: sessionQuery.isLoading,
        // Direct agent mode
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        // Orchestrated mode
        sendOrchestratedMessage: sendOrchestratedMessageMutation.mutateAsync,
        isOrchestrating: sendOrchestratedMessageMutation.isPending,
        activeAgents,
        // Shared
        streamingMessage,
        isStreaming,
        extractContent: extractContentMutation.mutateAsync,
        isExtracting: extractContentMutation.isPending,
        processMicroAction: processMicroActionMutation.mutateAsync,
        isProcessingMicroAction: processMicroActionMutation.isPending,
        deleteMessage: deleteMessageMutation.mutateAsync,
        isDeleting: deleteMessageMutation.isPending
    };
}
