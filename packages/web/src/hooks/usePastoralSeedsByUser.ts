import { useEffect, useState } from 'react';
import { pastoralSeedService } from '@dosfilos/application';
import { evaluatePastoralSeed, PASTORAL_SEED_STEP_ORDER, PastoralSeed } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

export interface PastoralSeedSummary {
    sermonId: string;
    seedId: string;
    passage: string;
    completedSteps: number;
    totalSteps: number;
    completed: boolean;
    updatedAt: Date;
}

interface UsePastoralSeedsByUserResult {
    seeds: PastoralSeedSummary[];
    /** Map keyed by `sermonId` for cheap cross-reference against the sermons list. */
    bySermonId: Map<string, PastoralSeedSummary>;
    loading: boolean;
    refetch: () => Promise<void>;
}

/**
 * Lists every PastoralSeed owned by the current user. Used by the
 * sermons page to surface a "Estudios en curso" tab — drafts whose
 * seed exists must be visible to the pastor as evidence of labor
 * (manifesto P1: labor antes que output), even when not yet published.
 *
 * Legacy wizard drafts (no seed) remain filtered out of the main
 * list via the existing `wizardProgress && !sourceSermonId` rule.
 */
export function usePastoralSeedsByUser(): UsePastoralSeedsByUserResult {
    const { user } = useFirebase();
    const [seeds, setSeeds] = useState<PastoralSeedSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        if (!user) {
            setSeeds([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const docs = await pastoralSeedService.listByUserId(user.uid);
            const summaries = docs.map((seed: PastoralSeed) => {
                const evaluation = evaluatePastoralSeed(seed);
                return {
                    sermonId: seed.sermonId,
                    seedId: seed.id,
                    passage: seed.passage,
                    completedSteps: evaluation.completedSteps.length,
                    totalSteps: PASTORAL_SEED_STEP_ORDER.length,
                    completed: seed.completed,
                    updatedAt: seed.updatedAt,
                } satisfies PastoralSeedSummary;
            });
            setSeeds(summaries);
        } catch (err) {
            console.error('[usePastoralSeedsByUser] error', err);
            setSeeds([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetch();
    }, [user]);

    const bySermonId = new Map(seeds.map((s) => [s.sermonId, s]));

    return { seeds, bySermonId, loading, refetch: fetch };
}
