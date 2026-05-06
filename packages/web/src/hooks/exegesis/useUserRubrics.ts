import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import type { PaperRubric, UserRubric } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

/**
 * React Query hook for the user's rubric template library.
 *
 * Cache key: `['exegesis', 'userRubrics', userId]`. Mutations invalidate
 * both the rubric library AND the papers cache (when applying a
 * template to a paper, the paper's `rubric` snapshot changes).
 */
export function useUserRubrics() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const rubricsQuery = useQuery({
        queryKey: ['exegesis', 'userRubrics', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.listUserRubrics.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createRubric = useMutation({
        mutationFn: async (input: {
            displayName: string;
            rubric?: PaperRubric;
            markAsDefault?: boolean;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.createUserRubric.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    const updateRubric = useMutation({
        mutationFn: async (input: {
            rubricId: string;
            displayName?: string;
            rubric?: PaperRubric;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.updateUserRubric.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    const deleteRubric = useMutation({
        mutationFn: async (rubricId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.deleteUserRubric.execute({ ownerId: user.uid, rubricId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    // Optimistic update — flip `isDefault` locally before the network
    // round-trip lands. The repo's `setDefault` transaction enforces the
    // single-default invariant on the backend, so mirroring that locally
    // (set target true, all siblings false) gives an instant UI toggle.
    // onError rolls back on failure; onSettled syncs with truth either
    // way so we don't drift if the optimistic guess was wrong.
    const setDefault = useMutation({
        mutationFn: async (rubricId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.setDefaultUserRubric.execute({ ownerId: user.uid, rubricId });
        },
        onMutate: async (rubricId: string) => {
            const queryKey = ['exegesis', 'userRubrics', user?.uid];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<UserRubric[]>(queryKey);
            if (previous) {
                queryClient.setQueryData<UserRubric[]>(
                    queryKey,
                    previous.map(r => ({ ...r, isDefault: r.id === rubricId })),
                );
            }
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['exegesis', 'userRubrics', user?.uid], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    const applyTemplate = useMutation({
        mutationFn: async (input: { paperId: string; rubricTemplateId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.applyRubricTemplateToPaper.execute({
                ownerId: user.uid,
                paperId: input.paperId,
                rubricTemplateId: input.rubricTemplateId,
            });
        },
        onSuccess: () => {
            // Both the library and the papers cache may need refresh
            // — the paper's embedded rubric just changed.
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    // Counterpart to `applyTemplate` for the strategy-only system
    // preset. Needed for papers that bypass the create wizard (e.g.
    // the Series planner deep-links straight into a paper) and so
    // never had a chance to pick the preset at create time.
    const applyStrategyOnly = useMutation({
        mutationFn: async (input: { paperId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.applyStrategyOnlyRubricToPaper.execute({
                ownerId: user.uid,
                paperId: input.paperId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const saveAsTemplate = useMutation({
        mutationFn: async (input: {
            paperId: string;
            displayName: string;
            markAsDefault?: boolean;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.saveCurrentRubricAsTemplate.execute({
                ownerId: user.uid,
                paperId: input.paperId,
                displayName: input.displayName,
                markAsDefault: input.markAsDefault,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    const createFromText = useMutation({
        mutationFn: async (input: {
            displayName: string;
            rawText?: string;
            language?: 'es' | 'en';
            markAsDefault?: boolean;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.createUserRubricFromText.execute({
                ownerId: user.uid,
                ...input,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'userRubrics', user?.uid] });
        },
    });

    return {
        rubrics: rubricsQuery.data ?? [],
        defaultRubric: (rubricsQuery.data ?? []).find(r => r.isDefault) ?? null,
        isLoading: rubricsQuery.isLoading,
        error: rubricsQuery.error,
        createRubric,
        updateRubric,
        deleteRubric,
        setDefault,
        applyTemplate,
        applyStrategyOnly,
        saveAsTemplate,
        createFromText,
    };
}
