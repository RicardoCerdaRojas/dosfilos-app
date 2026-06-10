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
            try {
                return await facultyService.listSessionExtractions.execute(user.uid, sessionId);
            } catch (err) {
                // Make Firestore errors visible — most common cause of a
                // silently empty "Generados" list is a composite index
                // that hasn't finished building (5-10 min after deploy).
                console.error('[useSessionExtractions] query failed', {
                    userId: user.uid,
                    sessionId,
                    error: err,
                });
                throw err;
            }
        },
        enabled: !!user?.uid && !!sessionId,
        retry: 1,
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
 *
 * Uses the trimmed `listUserExtractionSummaries` read — each artifact comes
 * back WITHOUT its `markdown` body (the dominant payload), so the list draws
 * from tiny docs. The full body for the selected artifact is fetched on demand
 * via {@link useExtraction} when it's opened in the editor.
 */
export function useUserExtractions() {
    const { user } = useFirebase();

    const listQuery = useQuery({
        queryKey: queryKeys.byUser(user?.uid),
        queryFn: async () => {
            if (!user?.uid) return [] as Extraction[];
            return facultyService.listUserExtractionSummaries.execute(user.uid);
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
        onMutate: ({ extractionId, title }) => {
            // Optimistic title swap so the inline editor commits to a
            // visible change immediately rather than flickering back to
            // the old title for ~500ms until the backend acks.
            queryClient.cancelQueries({ queryKey: ['faculty', 'extractions'] });
            const snapshots: Array<[readonly unknown[], unknown]> = [];
            queryClient
                .getQueriesData<Extraction[]>({ queryKey: ['faculty', 'extractions'] })
                .forEach(([key, data]) => {
                    if (!Array.isArray(data)) return;
                    snapshots.push([key, data]);
                    queryClient.setQueryData(
                        key,
                        data.map(e => (e.id === extractionId ? { ...e, title } : e)),
                    );
                });
            return { snapshots };
        },
        onError: (_err, _vars, context) => {
            context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSettled: invalidateAll,
    });

    /**
     * Optimistically rewrites the projectIds array on every cached
     * list query that contains this extraction, before the backend
     * ack arrives. Without this, the checkbox in the picker UI lags
     * ~500ms while React Query waits for the mutation to settle.
     *
     * Returns a snapshot of all touched queries so onError can roll
     * back on failure. Skips single-extraction queries (`...,'id',...`)
     * because the picker doesn't read from them — `onSettled` will
     * invalidate them anyway.
     */
    const optimisticPatchProjectIds = (
        extractionId: string,
        patch: (current: string[]) => string[],
    ) => {
        queryClient.cancelQueries({ queryKey: ['faculty', 'extractions'] });
        const snapshots: Array<[readonly unknown[], unknown]> = [];
        queryClient
            .getQueriesData<Extraction[]>({ queryKey: ['faculty', 'extractions'] })
            .forEach(([key, data]) => {
                if (!Array.isArray(data)) return;
                snapshots.push([key, data]);
                const next = data.map(e =>
                    e.id === extractionId
                        ? { ...e, projectIds: patch(e.projectIds) }
                        : e,
                );
                queryClient.setQueryData(key, next);
            });
        return snapshots;
    };

    const rollback = (snapshots: Array<[readonly unknown[], unknown]>) => {
        snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    };

    const addToProject = useMutation({
        mutationFn: async ({ extractionId, projectId }: { extractionId: string; projectId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.addExtractionToProject.execute(user.uid, extractionId, projectId);
        },
        onMutate: ({ extractionId, projectId }) => ({
            snapshots: optimisticPatchProjectIds(extractionId, current =>
                current.includes(projectId) ? current : [...current, projectId],
            ),
        }),
        onError: (_err, _vars, context) => {
            if (context?.snapshots) rollback(context.snapshots);
        },
        onSettled: invalidateAll,
    });

    const removeFromProject = useMutation({
        mutationFn: async ({ extractionId, projectId }: { extractionId: string; projectId: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.removeExtractionFromProject.execute(user.uid, extractionId, projectId);
        },
        onMutate: ({ extractionId, projectId }) => ({
            snapshots: optimisticPatchProjectIds(extractionId, current =>
                current.filter(id => id !== projectId),
            ),
        }),
        onError: (_err, _vars, context) => {
            if (context?.snapshots) rollback(context.snapshots);
        },
        onSettled: invalidateAll,
    });

    const deleteExtraction = useMutation({
        mutationFn: async (extractionId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            await facultyService.deleteExtraction.execute(user.uid, extractionId);
        },
        onSuccess: invalidateAll,
    });

    return { updateMarkdown, rename, addToProject, removeFromProject, deleteExtraction };
}
