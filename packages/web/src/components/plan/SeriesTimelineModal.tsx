import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
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

/**
 * Horizontal scrollable timeline of all sermons in a series. Plotted
 * by `scheduledDate` (sermons without a date appear in a dedicated
 * "Sin fecha" tray below). MVP v1 is visualization-only — no drag to
 * reschedule yet. Date editing happens inline on the series detail
 * table (popover on the date cell); the timeline is a glance-view.
 *
 * Replaces the previous full-page CalendarView tab — empty months
 * dominated the screen for typical 3-12 sermon series.
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

    const range = useMemo(() => {
        if (scheduled.length === 0) return null;
        const first = scheduled[0]!.scheduledDate;
        const last = scheduled[scheduled.length - 1]!.scheduledDate;
        return { first, last };
    }, [scheduled]);

    // Pixels per day — keeps the timeline readable for series spanning
    // anywhere from 2 weeks to 18 months.
    const PX_PER_DAY = 32;
    const TIMELINE_PADDING = 24;

    const positions = useMemo(() => {
        if (!range) return [];
        const firstMs = range.first.getTime();
        return scheduled.map((s) => {
            const days = Math.round((s.scheduledDate.getTime() - firstMs) / 86_400_000);
            return { sermon: s, x: TIMELINE_PADDING + days * PX_PER_DAY };
        });
    }, [scheduled, range]);

    const widthPx = useMemo(() => {
        if (!range) return 0;
        const totalDays = Math.round((range.last.getTime() - range.first.getTime()) / 86_400_000);
        return TIMELINE_PADDING * 2 + Math.max(totalDays, 7) * PX_PER_DAY;
    }, [range]);

    const monthMarkers = useMemo(() => {
        if (!range) return [];
        const markers: Array<{ x: number; label: string }> = [];
        const cursor = new Date(range.first.getFullYear(), range.first.getMonth(), 1);
        const end = range.last;
        const firstMs = range.first.getTime();
        while (cursor.getTime() <= end.getTime()) {
            const days = Math.round((cursor.getTime() - firstMs) / 86_400_000);
            const x = TIMELINE_PADDING + days * PX_PER_DAY;
            markers.push({
                x,
                label: cursor.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return markers;
    }, [range, locale]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
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
                    <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/30">
                        <div
                            className="relative"
                            style={{ width: `${widthPx}px`, minHeight: '180px' }}
                        >
                            {/* Month grid lines + labels */}
                            {monthMarkers.map((m, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-dashed border-border"
                                    style={{ left: `${m.x}px` }}
                                >
                                    <span className="absolute -top-0.5 left-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                        {m.label}
                                    </span>
                                </div>
                            ))}
                            {/* Spine */}
                            <div
                                className="absolute left-0 right-0 h-px bg-border"
                                style={{ top: '88px' }}
                            />
                            {/* Sermon cards */}
                            {positions.map(({ sermon, x }, idx) => (
                                <div
                                    key={sermon.id}
                                    className="absolute"
                                    style={{ left: `${x - 80}px`, top: '32px', width: '160px' }}
                                >
                                    <div
                                        className={cn(
                                            'rounded-md border bg-card shadow-sm px-2 py-1.5 text-[11px] leading-tight',
                                            sermon.status === 'complete'
                                                ? 'border-emerald-300'
                                                : sermon.status === 'in_progress'
                                                  ? 'border-amber-300'
                                                  : 'border-border',
                                        )}
                                    >
                                        <div className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {idx + 1}
                                        </div>
                                        <div className="font-medium text-foreground line-clamp-2">
                                            {sermon.title}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            {sermon.scheduledDate.toLocaleDateString(locale, {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </div>
                                    </div>
                                    {/* Dot on spine */}
                                    <div
                                        className={cn(
                                            'absolute h-2.5 w-2.5 rounded-full border-2 bg-background',
                                            sermon.status === 'complete'
                                                ? 'border-emerald-500'
                                                : sermon.status === 'in_progress'
                                                  ? 'border-amber-500'
                                                  : 'border-primary',
                                        )}
                                        style={{ left: '74px', top: '60px' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {unscheduled.length > 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
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
