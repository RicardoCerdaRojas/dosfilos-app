import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, ShieldAlert, RefreshCw, Loader2, Layers, Scale, FileWarning } from 'lucide-react';
import type { FidelityReport, SubstantiveClaim, AuthorityViolation, MissingAttribution } from '@dosfilos/domain';
import { useFidelityPassGate } from '@/hooks/usePastoralFidelityGate';
import { useRunFidelityPass } from '@/hooks/useRunFidelityPass';
import { FidelityVerdictRow } from './FidelityVerdictRow';
import { PluralityFailureRow } from './PluralityFailureRow';
import { AuthorityViolationRow } from './AuthorityViolationRow';
import { AttributionMissingRow } from './AttributionMissingRow';
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
    const { t } = useTranslation('sermonDetail');
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
            toast.success(t('fidelityReview.toastDone'));
            onReportUpdated?.();
        } catch {
            toast.error(t('fidelityReview.toastError'));
        }
    };

    return (
        <Card className="p-4" data-testid="fidelity-review-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-foreground/80" />
                    <h3 className="text-sm font-semibold">{t('fidelityReview.title')}</h3>
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
                            {t('fidelityReview.running')}
                        </>
                    ) : (
                        <>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            {report ? t('fidelityReview.rerun') : t('fidelityReview.run')}
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <p className="mb-3 text-xs text-destructive">{error}</p>
            )}

            {!report ? (
                <p className="text-sm text-muted-foreground">
                    {t('fidelityReview.empty')}
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
                                                {t('fidelityReview.attention')}
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
                                                {t('fidelityReview.supported')}
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

                    <AuthoritySection violations={report.authorityReport?.authorityViolations ?? []} />

                    <AttributionSection missing={report.attributionReport?.missingAttributions ?? []} />

                    {summary
                        && summary.totalMarkers === 0
                        && (report.pluralityReport?.failures.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t('fidelityReview.noMarkers')}
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

function AuthoritySection({ violations }: { violations: AuthorityViolation[] }) {
    const { t } = useTranslation('sermonDetail');
    if (violations.length === 0) return null;
    return (
        <section className="mt-4">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                {t('fidelityGate.authority.title')}
            </h4>
            <p className="mb-2 text-xs text-muted-foreground">
                {t('fidelityGate.authority.description')}
            </p>
            <div className="space-y-2">
                {violations.map((v, i) => (
                    <AuthorityViolationRow key={`${i}-${v.claim.slice(0, 24)}`} violation={v} />
                ))}
            </div>
        </section>
    );
}

function AttributionSection({ missing }: { missing: MissingAttribution[] }) {
    const { t } = useTranslation('sermonDetail');
    if (missing.length === 0) return null;
    return (
        <section className="mt-4">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileWarning className="h-3.5 w-3.5" />
                {t('fidelityGate.attribution.title')}
            </h4>
            <p className="mb-2 text-xs text-muted-foreground">
                {t('fidelityGate.attribution.description')}
            </p>
            <div className="space-y-2">
                {missing.map((m) => (
                    <AttributionMissingRow key={m.sourceId} missing={m} />
                ))}
            </div>
        </section>
    );
}

function GateBanner({ gateStatus }: { gateStatus: FidelityReport['gateStatus'] }) {
    const { t } = useTranslation('sermonDetail');
    if (gateStatus === 'pass') {
        return (
            <div
                className="mb-3 flex items-center gap-2 rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-xs text-success-subtle-foreground"
                data-testid="fidelity-gate-banner-pass"
            >
                <ShieldCheck className="h-4 w-4" />
                {t('fidelityReview.banner.pass')}
            </div>
        );
    }
    if (gateStatus === 'soft-block') {
        return (
            <div
                className="mb-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning-subtle-foreground"
                data-testid="fidelity-gate-banner-soft"
            >
                <AlertTriangle className="h-4 w-4" />
                {t('fidelityReview.banner.soft')}
            </div>
        );
    }
    return (
        <div
            className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            data-testid="fidelity-gate-banner-hard"
        >
            <ShieldAlert className="h-4 w-4" />
            {t('fidelityReview.banner.hard')}
        </div>
    );
}

function SummaryBar({ summary }: { summary: NonNullable<FidelityReport['summary']> }) {
    const { t } = useTranslation('sermonDetail');
    const items = [
        { key: 'supports', count: summary.supports, color: 'bg-success' },
        { key: 'partial', count: summary.partial, color: 'bg-warning' },
        { key: 'unrelated', count: summary.unrelated, color: 'bg-info' },
        { key: 'contradicts', count: summary.contradicts, color: 'bg-destructive' },
    ];
    const total = Math.max(1, summary.totalMarkers);
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('fidelityReview.markersEvaluated', { count: summary.totalMarkers })}</span>
                <span>
                    {t('fidelityReview.ratios', {
                        unrelated: Math.round(summary.unrelatedRatio * 100),
                        partial: Math.round(summary.partialRatio * 100),
                    })}
                </span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded bg-muted">
                {items.map((it) => (
                    <div
                        key={it.key}
                        className={cn(it.color)}
                        style={{ width: `${(it.count / total) * 100}%` }}
                        title={`${t(`fidelityReview.verdict.${it.key}`)}: ${it.count}`}
                    />
                ))}
            </div>
        </div>
    );
}

function FooterNote({ report }: { report: FidelityReport }) {
    const { t, i18n } = useTranslation('sermonDetail');
    const generatedAt =
        report.generatedAt instanceof Date ? report.generatedAt : new Date(report.generatedAt);
    const dateLocale = i18n.language.startsWith('en') ? 'en-US' : 'es-ES';
    const model =
        report.modelTier === 'mixed' ? 'Flash + Sonnet' : report.modelTier === 'sonnet' ? 'Sonnet 4.6' : 'Flash';
    return (
        <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
            {t('fidelityReview.lastReview', {
                date: generatedAt.toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }),
            })}
            {' · '}
            {t('fidelityReview.model', { model })}
        </p>
    );
}
