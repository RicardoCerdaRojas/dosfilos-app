import { useCallback, useState } from 'react';
import {
    CallableFidelityEvaluator,
    RunFidelityPassUseCase,
} from '@dosfilos/application';
import { FirebaseSermonRepository } from '@dosfilos/infrastructure';
import type { FidelityReport } from '@dosfilos/domain';

/**
 * Phase 3 PR 1 (ADR-029) — React hook around `RunFidelityPassUseCase`.
 *
 * Wires the use case with the production adapters
 * (`CallableFidelityEvaluator` → `evaluateClaimSourceFidelity` callable +
 * `FirebaseSermonRepository.updateFidelityReport`) and exposes a single
 * `run(sermonId, locale)` action plus loading + error state.
 *
 * Callers are responsible for refreshing their local `SermonEntity` after
 * the run completes — the hook returns the new `FidelityReport` so the UI
 * can patch optimistically without a roundtrip if it wants.
 */
export function useRunFidelityPass() {
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (sermonId: string, locale: 'es' | 'en' = 'es') => {
        setRunning(true);
        setError(null);
        try {
            const useCase = new RunFidelityPassUseCase(
                new CallableFidelityEvaluator(),
                new FirebaseSermonRepository(),
            );
            const report: FidelityReport = await useCase.execute({ sermonId, locale });
            return report;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setRunning(false);
        }
    }, []);

    return { run, running, error };
}
