import { useQuery } from '@tanstack/react-query';
import { pastoralSeedService } from '@dosfilos/application';
import type { RaisedDoubt } from '@dosfilos/domain';

/**
 * ADR-034 — reads the doubts the pastor raised mid-study (captured + routed by
 * `RunSocraticTurnUseCase`) so the Insight helper can resurface them as
 * candidate "open questions" at Paso 8. Cached per seed; cheap single read.
 */
export function useGuidedSeedDoubts(seedId: string | undefined) {
    return useQuery<RaisedDoubt[]>({
        queryKey: ['guidedSermon', 'doubts', seedId],
        enabled: !!seedId,
        staleTime: 60_000,
        queryFn: async () => {
            const seed = await pastoralSeedService.getById(seedId!);
            return seed?.openDoubts ?? [];
        },
    });
}
