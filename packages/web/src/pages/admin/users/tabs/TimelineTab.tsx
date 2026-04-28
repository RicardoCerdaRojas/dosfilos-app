import { useMemo, useState } from 'react';
import { useUserContentTimeline } from '@/hooks/admin/useUserContentTimeline';
import type { ContentActivity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { RecentContentList } from '@/components/admin/RecentContentList';

const RANGES: Array<{ value: string; days: number }> = [
    { value: '7', days: 7 },
    { value: '30', days: 30 },
    { value: '90', days: 90 },
];

const TYPES: Array<ContentActivity['type'] | 'all'> = [
    'all',
    'sermon',
    'series',
    'preaching_plan',
    'greek_session',
    'hebrew_session',
    'faculty_session',
    'project',
    'library_upload',
];

interface Props {
    userId: string;
}

export function TimelineTab({ userId }: Props) {
    const { t } = useTranslation('admin');
    const [range, setRange] = useState('30');
    const [typeFilter, setTypeFilter] = useState<ContentActivity['type'] | 'all'>('all');

    const days = Number(range);
    const { items, loading } = useUserContentTimeline(userId, days);

    const filtered = useMemo(() => {
        if (typeFilter === 'all') return items;
        return items.filter((i) => i.type === typeFilter);
    }, [items, typeFilter]);

    // Cheap day-bucket histogram for a sense of pace. Renders as inline SVG
    // sparkline so we don't pull in a chart library for what amounts to ~30
    // bars of useful pattern recognition.
    const histogram = useMemo(() => buildHistogram(items, days), [items, days]);

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RANGES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                    {t('users.timeline.range', { days: r.days })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPES.map((tt) => (
                                <SelectItem key={tt} value={tt}>
                                    {tt === 'all'
                                        ? t('users.timeline.allTypes')
                                        : t(`users.activity.recent.types.${tt}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="ml-auto text-sm text-muted-foreground tabular-nums">
                        {t('users.timeline.itemCount', { count: filtered.length })}
                    </div>
                </div>

                <div className="mt-4">
                    <Sparkline points={histogram} />
                </div>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="p-12 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('users.timeline.empty')}</p>
                </Card>
            ) : (
                <RecentContentList
                    content={filtered}
                    title={t('users.timeline.title', { days })}
                />
            )}
        </div>
    );
}

function buildHistogram(items: ContentActivity[], days: number): number[] {
    const buckets = new Array(days).fill(0);
    const now = Date.now();
    const dayMs = 86_400_000;
    for (const it of items) {
        const diffDays = Math.floor((now - it.createdAt.getTime()) / dayMs);
        if (diffDays >= 0 && diffDays < days) {
            // Index 0 = today on the right edge (oldest on the left).
            buckets[days - 1 - diffDays] += 1;
        }
    }
    return buckets;
}

function Sparkline({ points }: { points: number[] }) {
    if (points.length === 0) return null;
    const max = Math.max(1, ...points);
    const w = 100;
    const h = 28;
    const step = w / points.length;

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            className="w-full h-12 text-primary"
            aria-hidden="true"
        >
            {points.map((v, i) => {
                const barH = (v / max) * (h - 2);
                return (
                    <rect
                        key={i}
                        x={i * step + 0.3}
                        y={h - barH}
                        width={Math.max(0.6, step - 0.6)}
                        height={barH}
                        fill="currentColor"
                        opacity={v === 0 ? 0.15 : 0.85}
                    />
                );
            })}
        </svg>
    );
}
