import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { pastoralSeedService } from '@dosfilos/application';
import {
    AiAssistType,
    evaluatePastoralSeed,
    InsightField,
    isAiAssistAllowed,
    PASTORAL_SEED_STEP_ORDER,
    PastoralSeed,
    PastoralSeedEvaluation,
    PastoralSeedStepKey,
    PasteEvent,
    ToolUsage,
    WitnessReview,
    WordStudy,
} from '@dosfilos/domain';

interface UsePastoralSeedArgs {
    sermonId: string | null;
    userId: string | null;
    passage: string;
    projectId?: string;
    /**
     * When false, the hook skips Firestore traffic entirely. Callers
     * that mount the wizard behind the pastoral-fidelity flag toggle
     * pass `enabled={gateAllowed}` so flag-off users never read or
     * write the collection.
     */
    enabled: boolean;
}

interface UsePastoralSeedResult {
    seed: PastoralSeed | null;
    loading: boolean;
    saving: boolean;
    lastSavedAt: Date | null;
    /**
     * Combined pass/fail per step + global completion. Recomputed on
     * every local edit so step components can render their validators
     * without an extra fetch.
     */
    evaluation: PastoralSeedEvaluation | null;
    /**
     * Mutates a single field of the seed locally + schedules an
     * autosave. The patch is deep-merged into the in-memory seed and
     * forwarded to the repo as a top-level partial.
     */
    updateStep: <K extends PastoralSeedStepKey>(
        step: K,
        patch: Partial<PastoralSeed[K]>,
    ) => void;
    appendToolUsage: (usage: ToolUsage) => Promise<void>;
    appendPasteEvent: (event: PasteEvent) => Promise<void>;
    addWordStudy: (study: WordStudy) => Promise<void>;
    /**
     * Persists the Phase 2 three-witnesses review (ADR-011) on the seed.
     * Additive — does not affect `completed` (six-step validators only).
     */
    saveWitnessReview: (review: WitnessReview) => Promise<void>;
    /**
     * Phase 1.6 (ADR-024) — record a first-class assist log on the seed.
     * No-ops on AI-forbidden steps (reading / insight) so callers can
     * fire it unconditionally without risking a thrown write.
     */
    logAiAssist: (args: {
        stepKey: PastoralSeedStepKey;
        assistType: AiAssistType;
        outputWasEditedByUser: boolean;
    }) => Promise<void>;
    /**
     * Forces a save flush — used by step components on "Marcar paso
     * completo" CTAs so the breadcrumb advances immediately rather
     * than after the debounce window.
     */
    flush: () => Promise<void>;
}

/**
 * Hook backing the `PastoralSeedWizard`. Owns the in-memory copy of
 * the seed, debounced autosave (1s after the last keystroke), and the
 * derived `evaluation`. The wizard's gate hook reads `evaluation.completed`
 * to decide whether the pastor may leave Step 1 toward homiletics + draft.
 */
export function usePastoralSeed(args: UsePastoralSeedArgs): UsePastoralSeedResult {
    const { sermonId, userId, passage, projectId, enabled } = args;
    const [seed, setSeed] = useState<PastoralSeed | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const pendingPatchRef = useRef<Partial<PastoralSeed> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const failureToastShownRef = useRef(false);

    // One-shot fetch / mint when the wizard enters.
    useEffect(() => {
        let cancelled = false;
        if (!enabled || !sermonId || !userId) {
            setSeed(null);
            return;
        }
        setLoading(true);
        pastoralSeedService
            .ensureForSermon({ sermonId, userId, passage, projectId })
            .then((fresh) => {
                if (cancelled) return;
                setSeed(fresh);
            })
            .catch((err) => {
                console.error('[usePastoralSeed] ensureForSermon failed', err);
                if (!cancelled) {
                    toast.error('No pudimos cargar tu estudio. Intenta recargar.');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, sermonId, userId, passage, projectId]);

    const flushImmediate = useCallback(async () => {
        if (!seed || !pendingPatchRef.current) return;
        const patch = pendingPatchRef.current;
        pendingPatchRef.current = null;
        setSaving(true);
        try {
            await pastoralSeedService.savePatch({ seed, patch });
            setLastSavedAt(new Date());
            failureToastShownRef.current = false;
        } catch (err) {
            console.error('[usePastoralSeed] save failed', err);
            // Put the patch back so the next debounce flush retries.
            pendingPatchRef.current = { ...patch, ...(pendingPatchRef.current ?? {}) };
            if (!failureToastShownRef.current) {
                failureToastShownRef.current = true;
                toast.error('No pudimos guardar tu progreso. Reintentando…');
            }
        } finally {
            setSaving(false);
        }
    }, [seed]);

    const scheduleSave = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void flushImmediate();
        }, 1000);
    }, [flushImmediate]);

    const updateStep = useCallback(
        <K extends PastoralSeedStepKey>(step: K, patch: Partial<PastoralSeed[K]>) => {
            setSeed((prev) => {
                if (!prev) return prev;
                const mergedStep = { ...prev[step], ...patch } as PastoralSeed[K];
                const merged = { ...prev, [step]: mergedStep } as PastoralSeed;
                // Recompute completed inline so callers see consistent
                // state without waiting for the autosave round-trip.
                const evaluation = evaluatePastoralSeed(merged);
                merged.completed = evaluation.completed;
                // Pending patch tracks the FULL merged step object —
                // not the incremental diff. Firestore `updateDoc`
                // shallow-merges at the top level, so writing only the
                // freshly-typed field would replace the entire step
                // sub-document and drop sibling fields persisted by
                // earlier flushes (centralIdea typed → flushed →
                // observation typed → flush would overwrite the step
                // with only the observation field, losing centralIdea).
                pendingPatchRef.current = {
                    ...(pendingPatchRef.current ?? {}),
                    [step]: mergedStep,
                };
                return merged;
            });
            scheduleSave();
        },
        [scheduleSave],
    );

    const appendToolUsage = useCallback(
        async (usage: ToolUsage) => {
            if (!seed) return;
            try {
                await pastoralSeedService.appendToolUsage({ seed, tool: usage });
                setSeed((prev) =>
                    prev ? { ...prev, toolsConsulted: [...(prev.toolsConsulted ?? []), usage] } : prev,
                );
            } catch (err) {
                console.error('[usePastoralSeed] appendToolUsage failed', err);
            }
        },
        [seed],
    );

    const appendPasteEvent = useCallback(
        async (event: PasteEvent) => {
            if (!seed) return;
            try {
                await pastoralSeedService.appendPasteEvent({ seed, event });
                setSeed((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        insight: {
                            ...prev.insight,
                            pasteEvents: [...(prev.insight.pasteEvents ?? []), event],
                        },
                    };
                });
            } catch (err) {
                console.error('[usePastoralSeed] appendPasteEvent failed', err);
            }
        },
        [seed],
    );

    const addWordStudy = useCallback(
        async (study: WordStudy) => {
            if (!seed) return;
            try {
                await pastoralSeedService.addWordStudy({ seed, study });
                setSeed((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        wordStudies: {
                            ...prev.wordStudies,
                            studies: [...(prev.wordStudies?.studies ?? []), study],
                        },
                    };
                });
            } catch (err) {
                console.error('[usePastoralSeed] addWordStudy failed', err);
            }
        },
        [seed],
    );

    const saveWitnessReview = useCallback(
        async (review: WitnessReview) => {
            if (!seed) return;
            try {
                await pastoralSeedService.savePatch({ seed, patch: { witnessReview: review } });
                setSeed((prev) => (prev ? { ...prev, witnessReview: review } : prev));
            } catch (err) {
                console.error('[usePastoralSeed] saveWitnessReview failed', err);
                // Non-fatal: the gate already cleared in-memory; the review
                // is an audit artifact. Surface softly and let the pastor
                // proceed to the draft.
                toast.error('No pudimos guardar el registro de validación, pero puedes continuar.');
            }
        },
        [seed],
    );

    const logAiAssist = useCallback(
        async (args: {
            stepKey: PastoralSeedStepKey;
            assistType: AiAssistType;
            outputWasEditedByUser: boolean;
        }) => {
            if (!seed || !userId) return;
            // Guard client-side too so a forbidden step never hits Firestore.
            if (!isAiAssistAllowed(args.stepKey)) return;
            try {
                await pastoralSeedService.appendAiAssistLog({
                    seedId: seed.id,
                    log: {
                        userId,
                        stepKey: args.stepKey,
                        assistType: args.assistType,
                        outputWasEditedByUser: args.outputWasEditedByUser,
                    },
                });
            } catch (err) {
                // Non-fatal: the assist already happened; the audit is best-effort.
                console.error('[usePastoralSeed] logAiAssist failed', err);
            }
        },
        [seed, userId],
    );

    const flush = useCallback(async () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        await flushImmediate();
    }, [flushImmediate]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const evaluation = useMemo(
        () => (seed ? evaluatePastoralSeed(seed) : null),
        [seed],
    );

    return {
        seed,
        loading,
        saving,
        lastSavedAt,
        evaluation,
        updateStep,
        appendToolUsage,
        appendPasteEvent,
        addWordStudy,
        saveWitnessReview,
        logAiAssist,
        flush,
    };
}

/** Re-exported for consumers that need the canonical step order. */
export const PASTORAL_SEED_STEP_KEYS = PASTORAL_SEED_STEP_ORDER;

export type { InsightField, PastoralSeedStepKey };
