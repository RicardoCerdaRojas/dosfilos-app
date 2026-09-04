import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from 'react-i18next';
import type { AIChatSession, AIChatSessionContext, SupportedLanguage } from '@dosfilos/domain';
import {
    removeFromCachedLists,
    restoreCaches,
    updateInCachedLists,
} from '@/hooks/optimisticListCache';
import { track } from '@/lib/analytics/track';


export function useFacultySessions() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();
    const { i18n } = useTranslation();
    const language: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const historyQuery = useQuery({
        queryKey: ['faculty', 'sessions', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            // Trimmed list (no transcripts) — keeps the sidebar payload tiny.
            return await facultyService.getSessionSummaries.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createSession = useMutation({
        mutationFn: async ({
            agentId,
            initialMessage,
            projectId,
            context,
        }: {
            agentId: string;
            initialMessage?: string;
            projectId?: string;
            context?: AIChatSessionContext;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.createSession.execute(
                user.uid,
                agentId,
                initialMessage,
                projectId,
                language,
                context,
            );
        },
        onSuccess: (session, variables) => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] });
            // Hito 7 — Faculty top-of-funnel. Every new session = a
            // user activating the primary feature surface. Lets us
            // compute activation-rate-per-cohort once enough users
            // accumulate.
            track('faculty_session_started', {
                agentId: variables.agentId,
                hasProject: !!variables.projectId,
                hasContext: !!variables.context,
                hasInitialMessage: !!variables.initialMessage,
            });
        }
    });

    const sessionsKey = ['faculty', 'sessions', user?.uid] as const;

    const deleteSession = useMutation({
        mutationFn: async (sessionId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.deleteSession.execute(user.uid, sessionId);
        },
        // La sesión sale del riel al confirmar. Antes el diálogo se
        // cerraba y la fila seguía ahí hasta que volvía el servidor: un
        // segundo de silencio que se lee como «no me hizo caso».
        onMutate: (sessionId: string) => ({
            snapshots: removeFromCachedLists<AIChatSession>(
                queryClient,
                sessionsKey,
                session => session.id === sessionId,
            ),
        }),
        onError: (_err, _vars, context) => {
            if (context?.snapshots) restoreCaches(queryClient, context.snapshots);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: sessionsKey });
        },
    });

    const renameSession = useMutation({
        mutationFn: async ({ sessionId, title }: { sessionId: string, title: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.renameSession.execute(user.uid, sessionId, title);
        },
        // El título nuevo se ve al soltar el editor en línea, no cuando
        // el servidor confirma: quien acaba de escribirlo espera verlo.
        onMutate: ({ sessionId, title }) => ({
            snapshots: updateInCachedLists<AIChatSession>(
                queryClient,
                sessionsKey,
                session => session.id === sessionId,
                session => ({ ...session, title }),
            ),
        }),
        onError: (_err, _vars, context) => {
            if (context?.snapshots) restoreCaches(queryClient, context.snapshots);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: sessionsKey });
        },
    });

    return {
        sessions: historyQuery.data || [],
        isLoading: historyQuery.isLoading,
        error: historyQuery.error,
        createSession,
        deleteSession,
        renameSession,
    };
}

