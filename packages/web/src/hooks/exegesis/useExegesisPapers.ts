import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import type {
    AddProjectSourceInput,
    CreateExegeticalPaperInput,
    UpdateProjectSourceInput,
} from '@dosfilos/domain';

/**
 * React Query hook for the exegetical papers list + paper-level mutations.
 * Mirrors the cache-key conventions of `useFacultyProjects`:
 * `['exegesis', 'papers', userId]` for the list, and any mutation
 * invalidates that key on success.
 *
 * Source mutations (add/update/remove) live here too — sources are stored
 * inline on the paper document, so changing them invalidates the same
 * cache key as paper updates would.
 */
export function useExegesisPapers() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const papersQuery = useQuery({
        queryKey: ['exegesis', 'papers', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.listPapers.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createPaper = useMutation({
        mutationFn: async (input: Omit<CreateExegeticalPaperInput, 'ownerId'>) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.createPaper.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const archivePaper = useMutation({
        mutationFn: async ({ paperId, archived }: { paperId: string; archived: boolean }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return archived
                ? exegesisService.archivePaper.archive(user.uid, paperId)
                : exegesisService.archivePaper.unarchive(user.uid, paperId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const addSource = useMutation({
        mutationFn: async (input: AddProjectSourceInput & { paperId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.addSource.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const updateSource = useMutation({
        mutationFn: async (input: UpdateProjectSourceInput & { paperId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.updateSource.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const removeSource = useMutation({
        mutationFn: async ({ paperId, sourceId }: { paperId: string; sourceId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.removeSource.execute({ ownerId: user.uid, paperId, sourceId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    // ── Step mutations (D.1: state machine + placeholder generation) ──────

    const seedSteps = useMutation({
        mutationFn: async ({ paperId }: { paperId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.seedSteps.execute(user.uid, paperId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const generateStep = useMutation({
        mutationFn: async ({ paperId, stepId, regenerationHint }: { paperId: string; stepId: string; regenerationHint?: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.generateStep.execute({
                ownerId: user.uid,
                paperId,
                stepId,
                regenerationHint,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const acceptStep = useMutation({
        mutationFn: async ({ paperId, stepId, versionId }: { paperId: string; stepId: string; versionId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.acceptStep.execute({
                ownerId: user.uid,
                paperId,
                stepId,
                versionId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    const saveStepEdit = useMutation({
        mutationFn: async ({ paperId, stepId, markdown }: { paperId: string; stepId: string; markdown: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.saveStepEdit.execute({
                ownerId: user.uid,
                paperId,
                stepId,
                markdown,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });

    return {
        papers: papersQuery.data ?? [],
        isLoading: papersQuery.isLoading,
        error: papersQuery.error,
        createPaper,
        archivePaper,
        addSource,
        updateSource,
        removeSource,
        seedSteps,
        generateStep,
        acceptStep,
        saveStepEdit,
    };
}
