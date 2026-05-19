import { useQuery } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import type { DerivedArtifact, DerivedArtifactKind } from '@dosfilos/application';

/**
 * Unified read for everything derived from a single exegetical paper:
 * sermons in `sermons/{id}` with `sourcePaperId == paperId`, plus
 * extractions in `extractions/{id}` whose `externalRef` points back to
 * the paper. Powers the per-paper "Artefactos derivados" panel.
 *
 * Backed by `ListPaperDerivedArtifactsUseCase` so the Firestore
 * specifics live in infrastructure (hooks layer stays
 * framework-agnostic per the architecture compliance rule).
 *
 * The use case returns a `DerivedArtifact[]` with a `kind` discriminator
 * but no UI route — the hook layers `openUrl` on top because the
 * destination depends on the web router, not on domain logic.
 */

export interface PaperDerivedArtifact {
    id: string;
    kind: DerivedArtifactKind;
    title: string;
    createdAt: Date;
    openUrl: string;
    isDraft?: boolean;
}

export function usePaperDerivedArtifacts(paperId: string | null | undefined) {
    const { user } = useFirebase();
    const enabled = Boolean(user?.uid && paperId);

    return useQuery({
        queryKey: ['paper-artifacts', user?.uid, paperId],
        enabled,
        queryFn: async (): Promise<PaperDerivedArtifact[]> => {
            if (!user?.uid || !paperId) return [];
            const artifacts = await exegesisService.listPaperDerivedArtifacts.execute({
                ownerId: user.uid,
                paperId,
            });
            return artifacts.map(addOpenUrl);
        },
    });
}

function addOpenUrl(artifact: DerivedArtifact): PaperDerivedArtifact {
    return {
        ...artifact,
        openUrl: artifact.kind === 'sermon'
            ? `/dashboard/sermons/${artifact.id}`
            // All extraction types open into the unified Mis Recursos
            // editor — same surface Faculty extractions land in so the
            // user has one editing experience regardless of origin.
            : `/dashboard/recursos/${artifact.id}`,
    };
}
