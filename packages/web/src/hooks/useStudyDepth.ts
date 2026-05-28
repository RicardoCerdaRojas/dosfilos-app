import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pastoralSeedService, type OrientStudyInput, type StepOrientation } from '@dosfilos/application';
import type { DimensionId, DimensionOverrides, PastoralSeed, StudyDepthAssessment } from '@dosfilos/domain';

interface UseStudyDepthArgs {
    seed: PastoralSeed | null;
    /** When false (flag off), the hook does no Firestore traffic. */
    enabled: boolean;
}

interface UseStudyDepthResult {
    /** Coverage model computed from the seed + persisted manual overrides. */
    assessment: StudyDepthAssessment | null;
    loading: boolean;
    /** Set/clear a dimension's manual "covered" override (ADR-027). */
    setOverride: (dimensionId: DimensionId, pastorMarkedComplete: boolean) => Promise<void>;
    /** Run the step-orientation callable (Moment 1, ADR-026). */
    orient: (input: OrientStudyInput) => Promise<StepOrientation>;
}

/**
 * Phase 2.5 (ADR-025) — Study Companion coverage model for the wizard.
 *
 * The assessment is recomputed purely from the seed (structured evidence)
 * each time the seed changes; only the per-dim manual overrides are
 * persisted (in PR A). PR B will add inferred Faculty evidence to the same
 * model. Mirrors the plain-state style of `usePastoralSeed` (its sibling)
 * rather than TanStack Query — overrides are tiny and infrequent.
 */
export function useStudyDepth({ seed, enabled }: UseStudyDepthArgs): UseStudyDepthResult {
    const [overrides, setOverrides] = useState<DimensionOverrides>({});
    const [loading, setLoading] = useState(false);
    const loadedForSeed = useRef<string | null>(null);

    const seedId = seed?.id ?? null;

    useEffect(() => {
        if (!enabled || !seedId) return;
        if (loadedForSeed.current === seedId) return;
        loadedForSeed.current = seedId;
        let cancelled = false;
        setLoading(true);
        pastoralSeedService
            .getStudyDepthOverrides(seedId)
            .then((o) => {
                if (!cancelled) setOverrides(o);
            })
            .catch((err) => {
                console.error('[useStudyDepth] failed to load overrides', err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, seedId]);

    const assessment = useMemo<StudyDepthAssessment | null>(() => {
        if (!enabled || !seed) return null;
        return pastoralSeedService.computeStudyDepth(seed, overrides);
    }, [enabled, seed, overrides]);

    const setOverride = useCallback(
        async (dimensionId: DimensionId, pastorMarkedComplete: boolean) => {
            if (!seedId) return;
            // Optimistic — the badge reflects the toggle immediately.
            setOverrides((prev) => ({ ...prev, [dimensionId]: { pastorMarkedComplete } }));
            try {
                await pastoralSeedService.setStudyDepthOverride(seedId, dimensionId, pastorMarkedComplete);
            } catch (err) {
                console.error('[useStudyDepth] failed to persist override', err);
                // Revert on failure.
                setOverrides((prev) => ({ ...prev, [dimensionId]: { pastorMarkedComplete: !pastorMarkedComplete } }));
                throw err;
            }
        },
        [seedId],
    );

    const orient = useCallback(
        (input: OrientStudyInput) => pastoralSeedService.orientStudy(input),
        [],
    );

    return { assessment, loading, setOverride, orient };
}
