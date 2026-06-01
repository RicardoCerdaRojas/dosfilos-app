import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, ShieldAlert, RefreshCw, Loader2, Layers } from 'lucide-react';
import type { FidelityReport, SubstantiveClaim } from '@dosfilos/domain';
import { useFidelityPassGate } from '@/hooks/usePastoralFidelityGate';
import { useRunFidelityPass } from '@/hooks/useRunFidelityPass';
import { FidelityVerdictRow } from './FidelityVerdictRow';
import { PluralityFailureRow } from './PluralityFailureRow';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
    sermonId: string;
    /** Current persisted report, if any. */
    report?: FidelityReport;
    /** Refresh callback after a successful run — typically `useSermon().mutate`. */
    onReportUpdated?: () => void;
    /** Optional handler to scroll the editor to a `[N]` marker. */
    onJumpToMarker?: (marker: number) => void;
}

/**
 * Phase 3 PR 1 (ADR-029) — sidebar panel that shows the claim ↔ source
 * fidelity report for a sermon and exposes a "Revisar fidelidad" button to
 * trigger the second-pass LLM evaluator. Gated by the `fidelity_pass`
 * sub-flag (see `useFidelityPassGate`) — returns `null` for users who
 * haven't been opted in.
 *
 * The panel is read-only in PR 1: it surfaces verdicts + the gate banner,
 * but the publish gate enforcement lands in PR 2.
 */
export function FidelityReviewPanel({ sermonId, report, onReportUpdated, onJumpToMarker }: Props) {
    const gate = useFidelityPassGate();
    const { run, running, error } = useRunFidelityPass();

    const summary = report?.summary;
    const groupedVerdicts = useMemo(() => {
        if (!report) return null;
        return {
            attention: report.verdicts.filter((v) => v.verdict !== 'supports'),
            supports: report.verdicts.filter((v) => v.verdict === 'supports'),
        };
    }, [report]);

    if (gate.loading) return null;
    if (!gate.enabled) return null;

    const handleRun = async () => {
        try {
            await run(sermonId);
            toast.success('Revisión de fidelidad completada.');
            onReportUpdated?.();
        } catch {
            toast.error('No pudimos completar la revisión. Intenta de nuevo.');
        }
    };

    return (
        <Card className="p-4" data-testid="fidelity-review-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-foreground/80" />
                    <h3 className="text-sm font-semibold">Revisión de fidelidad</h3>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRun}
                    disabled={running}
                    data-testid="fidelity-run-button"
                >
                    {running ? (
                        <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Revisando…
                        </>
                    ) : (
                        <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            {report ? 'Volver a revisar' : 'Revisar fidelidad'}
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            {!report ? (
                <p className="text-sm text-muted-foreground">
                    Aún no se ha corrido la revisión para este sermón. La revisión evalúa, marcador por marcador,
                    si la fuente citada respalda la oración previa.
                </p>
            ) : (
                <>
                    {summary && summary.totalMarkers > 0 && (
                        <>
                            <GateBanner gateStatus={report.gateStatus} />
                            <SummaryBar summary={summary} />
                            {groupedVerdicts && (
                                <div className="mt-4 space-y-3">
                                    {groupedVerdicts.attention.length > 0 && (
                                        <section>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Requiere tu atención
                                            </h4>
                                            <div className="space-y-2">
                                                {groupedVerdicts.attention.map((v) => (
                                                    <FidelityVerdictRow
                                                        key={`${v.marker}-${v.evaluatedAt instanceof Date ? v.evaluatedAt.getTime() : 0}`}
                                                        verdict={v}
                                                        onJumpToMarker={onJumpToMarker}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                    {groupedVerdicts.supports.length > 0 && (
                                        <section>
                                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Respaldadas
                                            </h4>
                                            <div className="space-y-2">
                                                {groupedVerdicts.supports.map((v) => (
                                                    <FidelityVerdictRow
                                                        key={`${v.marker}-${v.evaluatedAt instanceof Date ? v.evaluatedAt.getTime() : 0}`}
                                                        verdict={v}
                                                        onJumpToMarker={onJumpToMarker}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <PluralitySection failures={report.pluralityReport?.failures ?? []} />

                    {summary
                        && summary.totalMarkers === 0
                        && (report.pluralityReport?.failures.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Este sermón no tiene marcadores de cita para revisar.
                        </p>
                    )}

                    <FooterNote report={report} />
                </>
            )}
        </Card>
    );
}

function PluralitySection({ failures }: { failures: SubstantiveClaim[] }) {
    const { t } = useTranslation('sermonDetail');
    if (failures.length === 0) return null;
    return (
        <section className="mt-4">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                {t('fidelityGate.plurality.title')}
            </h4>
            <p className="mb-2 text-xs text-muted-foreground">
                {t('fidelityGate.plurality.description')}
            </p>
            <div className="space-y-2">
                {failures.map((claim, i) => (
                    <PluralityFailureRow key={`${i}-${claim.claimText.slice(0, 24)}`} claim={claim} />
                ))}
            </div>
        </section>
    );
}

function GateBanner({ gateStatus }: { gateStatus: FidelityReport['gateStatus'] }) {
    if (gateStatus === 'pass') {
        return (
            <div
                className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                data-testid="fidelity-gate-banner-pass"
            >
                <ShieldCheck className="h-4 w-4" />
                Las citas respaldan los reclamos del borrador.
            </div>
        );
    }
    if (gateStatus === 'soft-block') {
        return (
            <div
                className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                data-testid="fidelity-gate-banner-soft"
            >
                <AlertTriangle className="h-4 w-4" />
                Algunas citas respaldan parcialmente el reclamo. Revisa los marcadores marcados antes de publicar.
            </div>
        );
    }
    return (
        <div
            className="mb-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
            data-testid="fidelity-gate-banner-hard"
        >
            <ShieldAlert className="h-4 w-4" />
            Demasiados marcadores sin respaldo o que contradicen su fuente. Corrige las citas antes de publicar.
        </div>
    );
}

function SummaryBar({ summary }: { summary: NonNullable<FidelityReport['summary']> }) {
    const items = [
        { key: 'supports', label: 'Respalda', count: summary.supports, color: 'bg-emerald-500' },
        { key: 'partial', label: 'Parcial', count: summary.partial, color: 'bg-amber-500' },
        { key: 'unrelated', label: 'No respalda', count: summary.unrelated, color: 'bg-orange-500' },
        { key: 'contradicts', label: 'Contradice', count: summary.contradicts, color: 'bg-rose-500' },
    ];
    const total = Math.max(1, summary.totalMarkers);
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.totalMarkers} marcadores evaluados</span>
                <span>
                    {Math.round(summary.unrelatedRatio * 100)}% sin respaldo · {Math.round(summary.partialRatio * 100)}% parcial
                </span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded bg-muted">
                {items.map((it) => (
                    <div
                        key={it.key}
                        className={cn(it.color)}
                        style={{ width: `${(it.count / total) * 100}%` }}
                        title={`${it.label}: ${it.count}`}
                    />
                ))}
            </div>
        </div>
    );
}

function FooterNote({ report }: { report: FidelityReport }) {
    const generatedAt =
        report.generatedAt instanceof Date ? report.generatedAt : new Date(report.generatedAt);
    return (
        <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            Última revisión: {generatedAt.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            {' · '}Modelo: {report.modelTier === 'mixed' ? 'Flash + Sonnet' : report.modelTier === 'sonnet' ? 'Sonnet 4.6' : 'Flash'}
        </p>
    );
}
