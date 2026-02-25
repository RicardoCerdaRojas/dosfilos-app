import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';


export function useFacultySessions() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const historyQuery = useQuery({
        queryKey: ['faculty', 'sessions', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.getHistory.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createSession = useMutation({
        mutationFn: async ({ agentId, initialMessage }: { agentId: string; initialMessage?: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.createSession.execute(user.uid, agentId, initialMessage);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] });
        }
    });

    const deleteSession = useMutation({
        mutationFn: async (sessionId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.deleteSession.execute(user.uid, sessionId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] });
        }
    });

    const renameSession = useMutation({
        mutationFn: async ({ sessionId, title }: { sessionId: string, title: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.renameSession.execute(user.uid, sessionId, title);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] });
        }
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

