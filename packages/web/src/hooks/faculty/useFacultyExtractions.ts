import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import type { Extraction } from '@dosfilos/domain';

const queryKeys = {
    bySession: (uid: string | undefined, sessionId: string | undefined) =>
        ['faculty', 'extractions', 'session', uid, sessionId] as const,
    byProject: (uid: string | undefined, projectId: string | undefined) =>
        ['faculty', 'extractions', 'project', uid, projectId] as const,
    byUser: (uid: string | undefined) =>
        ['faculty', 'extractions', 'user', uid] as const,
    byId: (uid: string | undefined, extractionId: string | undefined) =>
        ['faculty', 'extractions', 'id', uid, extractionId] as const,
};

/**
 * Extractions scoped to a single chat session. Used by the panel inside
 * the chat to show the "Generados" tab. Empty array (not undefined)
 * when the session has no artifacts yet so callers can render
 * `extractions.length` without null-checking.
 */
export function useSessionExtractions(sessionId: string | undefined) {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const listQuery = useQuery({
        queryKey: queryKeys.bySession(user?.uid, sessionId),
        queryFn: async () => {
            if (!user?.uid || !sessionId) return [] as Extraction[];
            return facultyService.listSessionExtractions.execute(user.uid, sessionId);
        },
        enabled: !!user?.uid && !!sessionId,
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['faculty', 'extractions'] });
    };

    return {
        extractions: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error,
        refetch: listQuery.refetch,
        invalidateAll,
    };
}

/**
 * Extractions pinned to a project. Used by the project library page.
 * Includes artifacts from any session, as long as projectId matches.
 */
export function useProjectExtractions(projectId: string | undefined) {
    const { user } = useFirebase();

    const listQuery = useQuery({
        queryKey: queryKeys.byProject(user?.uid, projectId),
        queryFn: async () => {
            if (!user?.uid || !projectId) return [] as Extraction[];
            return facultyService.listProjectExtractions.execute(user.uid, projectId);
        },
        enabled: !!user?.uid && !!projectId,
    });

    return {
        extractions: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error,
        refetch: listQuery.refetch,
    };
}

/**
 * All extractions owned by the current user, newest first. Used by the
 * cross-session library page at /dashboard/faculty/library.
 */
export function useUserExtractions() {
    const { user } = useFirebase();

    const listQuery = useQuery({
        queryKey: queryKeys.byUser(user?.uid),
        queryFn: async () => {
            if (!user?.uid) return [] as Extraction[];
            return facultyService.listUserExtractions.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    return {
        extractions: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error,
        refetch: listQuery.refetch,
    };
}

/**
 * Fetch a single extraction by id. Returns null when not found / not
 * owned by the user (the repo enforces ownership server-side; this
 * just surfaces null cleanly in the UI).
 */
export function useExtraction(extractionId: string | undefined) {
    const { user } = useFirebase();

    const query = useQuery({
        queryKey: queryKeys.byId(user?.uid, extractionId),
        queryFn: async () => {
            if (!user?.uid || !extractionId) return null;
            return facultyService.getExtraction.execute(user.uid, extractionId);
        },
        enabled: !!user?.uid && !!extractionId,
    });

    return {
        extraction: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

/**
 * Mutations for the lifecycle ops. Each invalidates the relevant
 * query keys so list views update without a manual refetch.
 */
export function useExtractionMutations() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['faculty', 'extractions'] });
    };

    const updateMarkdown = useMutation({
        mutationFn: async ({ extractionId, markdown }: { extractionId: string; markdown: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.updateExtractionMarkdown.execute(user.uid, extractionId, markdown);
        },
        onSuccess: invalidateAll,
    });

    const rename = useMutation({
        mutationFn: async ({ extractionId, title }: { extractionId: string; title: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.renameExtraction.execute(user.uid, extractionId, title);
        },
        onSuccess: invalidateAll,
    });

    const pinToProject = useMutation({
        mutationFn: async ({ extractionId, projectId }: { extractionId: string; projectId: string | null }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.pinExtractionToProject.execute(user.uid, extractionId, projectId);
        },
        onSuccess: invalidateAll,
    });

    const deleteExtraction = useMutation({
        mutationFn: async (extractionId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.deleteExtraction.execute(user.uid, extractionId);
        },
        onSuccess: invalidateAll,
    });

    return { updateMarkdown, rename, pinToProject, deleteExtraction };
}
