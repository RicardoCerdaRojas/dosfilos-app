import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import type { CreateExegeticalPaperInput } from '@dosfilos/domain';

/**
 * React Query hook for the exegetical papers list + paper-level mutations.
 * Mirrors the cache-key conventions of `useFacultyProjects`:
 * `['exegesis', 'papers', userId]` for the list, and any mutation
 * invalidates that key on success.
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

    return {
        papers: papersQuery.data ?? [],
        isLoading: papersQuery.isLoading,
        error: papersQuery.error,
        createPaper,
        archivePaper,
    };
}
