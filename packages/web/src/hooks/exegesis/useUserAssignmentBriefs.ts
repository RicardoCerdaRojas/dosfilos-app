import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import type { UserAssignmentBrief } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

/**
 * React Query hook for the user's assignment-brief template library.
 * Mirrors `useUserRubrics` — same cache shape, same optimistic
 * setDefault pattern.
 */
export function useUserAssignmentBriefs() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const briefsQuery = useQuery({
        queryKey: ['exegesis', 'userAssignmentBriefs', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.listUserAssignmentBriefs.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createBrief = useMutation({
        mutationFn: async (input: { displayName: string; body: string; markAsDefault?: boolean }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.createUserAssignmentBrief.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userAssignmentBriefs', user?.uid] });
        },
    });

    const updateBrief = useMutation({
        mutationFn: async (input: { briefId: string; displayName?: string; body?: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.updateUserAssignmentBrief.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userAssignmentBriefs', user?.uid] });
        },
    });

    const deleteBrief = useMutation({
        mutationFn: async (briefId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.deleteUserAssignmentBrief.execute({ ownerId: user.uid, briefId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userAssignmentBriefs', user?.uid] });
        },
    });

    const setDefault = useMutation({
        mutationFn: async (briefId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.setDefaultUserAssignmentBrief.execute({ ownerId: user.uid, briefId });
        },
        onMutate: async (briefId: string) => {
            const queryKey = ['exegesis', 'userAssignmentBriefs', user?.uid];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<UserAssignmentBrief[]>(queryKey);
            if (previous) {
                queryClient.setQueryData<UserAssignmentBrief[]>(
                    queryKey,
                    previous.map(b => ({ ...b, isDefault: b.id === briefId })),
                );
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['exegesis', 'userAssignmentBriefs', user?.uid], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userAssignmentBriefs', user?.uid] });
        },
    });

    return {
        briefs: briefsQuery.data ?? [],
        defaultBrief: (briefsQuery.data ?? []).find(b => b.isDefault) ?? null,
        isLoading: briefsQuery.isLoading,
        error: briefsQuery.error,
        createBrief,
        updateBrief,
        deleteBrief,
        setDefault,
    };
}
