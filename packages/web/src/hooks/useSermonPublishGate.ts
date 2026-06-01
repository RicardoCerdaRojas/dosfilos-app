import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FidelityGateError, type FidelityReport } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useFidelityPassGate } from './usePastoralFidelityGate';
import { useRunFidelityPass } from './useRunFidelityPass';
import { usePublishSermon } from './use-sermons';

/**
 * A report is "fresh" enough to gate on when it exists and no verdict was
 * invalidated since it was generated (Q6 staleness). Otherwise the pass is
 * re-run before the gate decides.
 */
function isReportFresh(report?: FidelityReport): report is FidelityReport {
    return !!report && report.verdicts.every((v) => v.stale !== true);
}

interface Options {
    /** Called after a successful publish so the caller can refresh + navigate. */
    onPublished: () => void;
}

/**
 * Phase 3 PR 2 (ADR-029) — orchestrates the claim↔source fidelity gate for a
 * publish action.
 *
 * Flow when the `fidelity_pass` flag is on:
 *   1. Ensure a fresh `FidelityReport` (run the pass if missing/stale).
 *   2. `pass`        → publish directly.
 *   3. `soft|hard`   → open `PrePublishFidelityModal` (the component decides
 *                      override vs. fix-only based on the status).
 *   4. Override      → publish with the justification; the service persists
 *                      the `GateOverride` audit + enforces the gate again.
 *
 * Flag off → publishes exactly as before (blast radius 0).
 *
 * Returns everything the page needs to drive the button + modal so the page
 * handler stays a one-liner (composition standard: handlers ≤30 lines).
 */
export function useSermonPublishGate({ onPublished }: Options) {
    const { t } = useTranslation('sermonDetail');
    const { user } = useFirebase();
    const gate = useFidelityPassGate();
    const { run } = useRunFidelityPass();
    const { publishSermon, loading: publishing } = usePublishSermon();

    const [preparing, setPreparing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [report, setReport] = useState<FidelityReport | null>(null);

    const finishPublished = useCallback(() => {
        setModalOpen(false);
        toast.success(t('fidelityGate.toast.published'));
        onPublished();
    }, [onPublished, t]);

    const attemptPublish = useCallback(
        async (sermonId: string, existing?: FidelityReport) => {
            // Flag off → legacy publish, no fidelity gate.
            if (!gate.enabled) {
                try {
                    await publishSermon(sermonId);
                    finishPublished();
                } catch {
                    toast.error(t('fidelityGate.toast.error'));
                }
                return;
            }

            setPreparing(true);
            try {
                const fresh = isReportFresh(existing) ? existing : await run(sermonId);
                setReport(fresh);
                if (fresh.gateStatus === 'pass') {
                    await publishSermon(sermonId);
                    finishPublished();
                    return;
                }
                setModalOpen(true);
            } catch (err) {
                const key = err instanceof FidelityGateError ? 'error' : 'reviewFailed';
                toast.error(t(`fidelityGate.toast.${key}`));
            } finally {
                setPreparing(false);
            }
        },
        [gate.enabled, run, publishSermon, finishPublished, t],
    );

    const confirmOverride = useCallback(
        async (sermonId: string, reason: string) => {
            try {
                await publishSermon(sermonId, {
                    reason,
                    overriddenBy: user?.uid ?? 'unknown',
                    // PR 2 only surfaces the partial soft-block; plurality /
                    // authority bypass kinds land with PR 3/4.
                    bypassedKind: 'partial',
                });
                finishPublished();
            } catch {
                toast.error(t('fidelityGate.toast.error'));
            }
        },
        [publishSermon, user?.uid, finishPublished, t],
    );

    return {
        /** True iff the fidelity gate participates in this publish. */
        gateEnabled: gate.enabled,
        /** Running the pass before deciding — drives the button spinner. */
        preparing,
        /** Publish (or override write) in flight. */
        publishing,
        /** Fresh report backing the modal. */
        report,
        modalOpen,
        setModalOpen,
        attemptPublish,
        confirmOverride,
    };
}
