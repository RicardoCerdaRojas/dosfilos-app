import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    computeCorpusCoverageReport,
    type CorpusCoverageRow,
    type ExegeticalPaper,
} from '@dosfilos/domain';
import { cn } from '@/lib/utils';

interface CorpusCoverageReportProps {
    paper: ExegeticalPaper;
}

/**
 * v1.7 corpus-usage planning — post-assembly coverage report.
 *
 * Shows one row per source in the corpus with the four states the
 * spec defined (planned-and-cited, planned-not-cited, cited-not-planned,
 * never-cited). The user closes the loop: deciding which warnings to
 * act on (regenerate verse / remove source) is left to them.
 *
 * Renders nothing when the paper has no sources OR no accepted steps
 * yet (the report would be all-empty noise pre-generation).
 */
export function CorpusCoverageReport({ paper }: CorpusCoverageReportProps) {
    const { t } = useTranslation('exegesis');
    const rows = useMemo(() => computeCorpusCoverageReport(paper), [paper]);

    const hasAccepted = paper.steps.some(s => s.accepted !== null);
    if (rows.length === 0 || !hasAccepted) return null;

    const counts = rows.reduce(
        (acc, r) => {
            acc[r.status]++;
            return acc;
        },
        {
            'planned-and-cited': 0,
            'planned-not-cited': 0,
            'cited-not-planned': 0,
            'never-cited': 0,
        } as Record<CorpusCoverageRow['status'], number>,
    );

    return (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                    {t('coverageReport.heading')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                    {t('coverageReport.summary', {
                        total: rows.length,
                        cited: counts['planned-and-cited'] + counts['cited-not-planned'],
                    })}
                </p>
            </header>
            <ul className="space-y-1.5" role="list">
                {rows.map(row => (
                    <CoverageRow key={row.sourceId} row={row} />
                ))}
            </ul>
        </section>
    );
}

function CoverageRow({ row }: { row: CorpusCoverageRow }) {
    const { t } = useTranslation('exegesis');
    const variant = STATUS_VARIANTS[row.status];

    return (
        <li
            className={cn(
                'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[12px]',
                variant.tone,
            )}
            role="listitem"
        >
            <variant.Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', variant.iconClass)} aria-hidden />
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{row.label}</p>
                <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">
                    {t(`coverageReport.status.${row.status}`, {
                        plannedCount: row.plannedStepIds.length,
                        citedCount: row.citedStepIds.length,
                    })}
                </p>
            </div>
        </li>
    );
}

const STATUS_VARIANTS: Record<
    CorpusCoverageRow['status'],
    { Icon: typeof CheckCircle2; tone: string; iconClass: string }
> = {
    'planned-and-cited': {
        Icon: CheckCircle2,
        tone: 'border-success/30 bg-success-subtle/40',
        iconClass: 'text-success',
    },
    'planned-not-cited': {
        Icon: AlertTriangle,
        tone: 'border-warning/40 bg-warning-subtle/60',
        iconClass: 'text-warning',
    },
    'cited-not-planned': {
        Icon: Info,
        tone: 'border-info/30 bg-info-subtle/40',
        iconClass: 'text-info',
    },
    'never-cited': {
        Icon: Trash2,
        tone: 'border-destructive/30 bg-destructive/5',
        iconClass: 'text-destructive',
    },
};
