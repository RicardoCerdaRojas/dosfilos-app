import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService, libraryService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * React Query hook for the user's style guides + upload + activation.
 *
 * Cache key: `['exegesis', 'styleGuides', userId]`. The `uploadGuide`
 * mutation is two-step:
 *   1. `libraryService.uploadResource(...)` writes the file to Firebase
 *      Storage and creates a `library_resources` doc; LlamaParse
 *      extraction continues async on the server.
 *   2. `exegesisService.createStyleGuide.execute(...)` creates the
 *      `userStyleGuides` doc that points at the resource.
 *
 * The UI surfaces upload progress via the optional `onProgress`
 * callback passed into `uploadGuide.mutateAsync`. Extraction status
 * (LlamaParse running, ready, failed) is NOT shown by the wizard for
 * v1 — the orchestrator will check it before generating, and a
 * "extraction not ready" message will surface there if needed.
 */
export function useUserStyleGuides() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const guidesQuery = useQuery({
        queryKey: ['exegesis', 'styleGuides', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.listStyleGuides.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const uploadGuide = useMutation({
        mutationFn: async (input: {
            file: File;
            displayName: string;
            version?: string;
            setActive?: boolean;
            onProgress?: (percentage: number) => void;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');

            // Step 1 — upload file via the library pipeline. We tag the
            // resource with type 'other' since 'tms-style-guide' isn't a
            // ResourceType yet; the relationship is captured by the
            // userStyleGuides doc that follows. The library will show
            // this resource in the user's list — that's intentional for
            // v1 (the user's own guide IS theirs to manage).
            const resource = await libraryService.uploadResource(
                user.uid,
                input.file,
                {
                    title: input.displayName,
                    author: '',
                    type: 'other',
                },
                input.onProgress
            );

            // Step 2 — create the UserStyleGuide doc pointing at the
            // freshly-uploaded resource.
            return exegesisService.createStyleGuide.execute({
                ownerId: user.uid,
                displayName: input.displayName,
                corpusId: resource.id,
                version: input.version,
                setActive: input.setActive,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'styleGuides', user?.uid] });
        },
    });

    const setActive = useMutation({
        mutationFn: async (guideId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.setActiveStyleGuide.execute(user.uid, guideId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'styleGuides', user?.uid] });
        },
    });

    const deleteGuide = useMutation({
        mutationFn: async (guideId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.deleteStyleGuide.execute(user.uid, guideId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'styleGuides', user?.uid] });
        },
    });

    const extractManifest = useMutation({
        mutationFn: async (input: { guideId: string; language?: 'es' | 'en' }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.extractStyleGuideManifest.execute({
                ownerId: user.uid,
                guideId: input.guideId,
                language: input.language,
            });
        },
        onSuccess: () => {
            // Invalidate the guides query so the manifest viewer
            // re-renders with the freshly-extracted rules.
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'styleGuides', user?.uid] });
        },
    });

    return {
        guides: guidesQuery.data ?? [],
        activeGuide: (guidesQuery.data ?? []).find(g => g.isActive) ?? null,
        isLoading: guidesQuery.isLoading,
        error: guidesQuery.error,
        uploadGuide,
        setActive,
        deleteGuide,
        extractManifest,
    };
}
