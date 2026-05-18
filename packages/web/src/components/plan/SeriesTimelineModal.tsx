import { useMemo } from 'react';
import { CalendarDays, CheckCircle2, Clock, CircleDot } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { SermonItem } from '@/hooks/useSeriesData';

interface SeriesTimelineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sermons: ReadonlyArray<SermonItem>;
}

interface TimelineRow {
    sermon: SermonItem & { scheduledDate: Date };
    daysFromPrev: number | null;
    monthHeader: string | null;
}

/**
 * Vertical chronological list of all sermons in a series. Sermons
 * with `scheduledDate` are grouped by month header and ordered
 * ascending; sermons without a date appear in a separate tray at the
 * bottom. MVP visualization-only — date changes happen on the main
 * table via `InlineDateEditor`.
 *
 * Vertical layout chosen over horizontal-spine after real testing:
 * 3-12 sermons fit better as a scrollable list than a wide canvas,
 * cards never overlap regardless of date spacing, and gaps between
 * dates are shown explicitly (e.g. "8 días después") instead of
 * being inferred from pixel distance.
 */
export function SeriesTimelineModal({ open, onOpenChange, sermons }: SeriesTimelineModalProps) {
    const { t, i18n } = useTranslation('series');
    const locale = i18n.language?.split('-')[0] === 'en' ? 'en-US' : 'es-ES';

    const scheduled = useMemo(
        () =>
            sermons
                .filter((s): s is SermonItem & { scheduledDate: Date } => Boolean(s.scheduledDate))
                .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()),
        [sermons],
    );
    const unscheduled = useMemo(
        () => sermons.filter((s) => !s.scheduledDate),
        [sermons],
    );

    const rows: TimelineRow[] = useMemo(() => {
        let prevMonth: string | null = null;
        return scheduled.map((sermon, idx) => {
            const monthKey = sermon.scheduledDate.toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
            });
            const monthHeader = monthKey !== prevMonth ? monthKey : null;
            prevMonth = monthKey;
            const daysFromPrev = idx === 0
                ? null
                : Math.round(
                      (sermon.scheduledDate.getTime() - scheduled[idx - 1]!.scheduledDate.getTime())
                          / 86_400_000,
                  );
            return { sermon, daysFromPrev, monthHeader };
        });
    }, [scheduled, locale]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t('detail.timeline.title')}
                    </DialogTitle>
                    <DialogDescription>{t('detail.timeline.description')}</DialogDescription>
                </DialogHeader>

                {scheduled.length === 0 && unscheduled.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        {t('detail.timeline.empty')}
                    </div>
                )}

                {scheduled.length > 0 && (
                    <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                        <ol className="relative">
                            {/* Vertical spine */}
                            <div
                                className="absolute left-[88px] top-1.5 bottom-1.5 w-px bg-border"
                                aria-hidden
                            />
                            {rows.map(({ sermon, daysFromPrev, monthHeader }, idx) => (
                                <li key={sermon.id} className="relative">
                                    {monthHeader && (
                                        <div className="flex items-center gap-2 py-1.5 pl-[104px] pr-2 mt-2 first:mt-0">
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                {monthHeader}
                                            </span>
                                            <div className="flex-1 h-px bg-border/60" />
                                        </div>
                                    )}
                                    {daysFromPrev !== null && daysFromPrev > 0 && !monthHeader && (
                                        <div className="pl-[104px] py-1">
                                            <span className="text-[10.5px] text-muted-foreground/70">
                                                {t('detail.timeline.daysGap', { count: daysFromPrev }) as string}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-3 py-2.5">
                                        {/* Date column */}
                                        <div className="w-[80px] shrink-0 text-right">
                                            <div className="text-[15px] font-semibold text-foreground leading-none">
                                                {sermon.scheduledDate.toLocaleDateString(locale, {
                                                    day: 'numeric',
                                                })}
                                            </div>
                                            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                                {sermon.scheduledDate.toLocaleDateString(locale, {
                                                    month: 'short',
                                                })}
                                            </div>
                                        </div>
                                        {/* Dot on spine */}
                                        <div className="shrink-0 relative w-3 flex justify-center pt-1">
                                            <span
                                                className={cn(
                                                    'block h-3 w-3 rounded-full border-2 bg-background',
                                                    sermon.status === 'complete'
                                                        ? 'border-emerald-500'
                                                        : sermon.status === 'in_progress'
                                                          ? 'border-amber-500'
                                                          : 'border-primary',
                                                )}
                                            />
                                        </div>
                                        {/* Body */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="text-[11px] font-mono text-muted-foreground">
                                                    #{idx + 1}
                                                </span>
                                                <span className="text-[14px] font-medium text-foreground">
                                                    {sermon.title}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground flex-wrap">
                                                {sermon.passage && (
                                                    <>
                                                        <span className="font-mono">{sermon.passage}</span>
                                                        <span>·</span>
                                                    </>
                                                )}
                                                <StatusLabel status={sermon.status} t={t} />
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {unscheduled.length > 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 shrink-0">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                            {t('detail.timeline.unscheduled', { count: unscheduled.length }) as string}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {unscheduled.map((s) => (
                                <Badge key={s.id} variant="outline" className="text-[11px]">
                                    {s.title}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function StatusLabel({
    status,
    t,
}: {
    status: SermonItem['status'];
    t: (key: string) => string;
}) {
    if (status === 'complete')
        return (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {t('detail.table.status.complete')}
            </span>
        );
    if (status === 'in_progress')
        return (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Clock className="h-3 w-3" />
                {t('detail.table.status.inProgress')}
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1">
            <CircleDot className="h-3 w-3" />
            {t('detail.table.status.planned')}
        </span>
    );
}
