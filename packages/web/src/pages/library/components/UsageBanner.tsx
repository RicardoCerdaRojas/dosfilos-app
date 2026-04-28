import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface MonthlyUsage {
    docs: { current: number; limit?: number };
    pagesProcessed: { current: number; limit?: number };
    queries: { current: number; limit?: number };
    periodKey: string;
}

/**
 * Compact monthly-quota strip shown at the top of the Library page. Two
 * progress bars (queries + docs) plus an upgrade CTA when the user is at or
 * over 80%. Hidden when the plan has unlimited quotas (queriesPerMonth = -1).
 */
export function UsageBanner() {
    const { t } = useTranslation('library');
    const navigate = useNavigate();
    const { getMonthlyUsage } = useUsageLimits();
    const [usage, setUsage] = useState<MonthlyUsage | null>(null);

    useEffect(() => {
        let cancelled = false;
        getMonthlyUsage()
            .then(u => { if (!cancelled && u) setUsage(u); })
            .catch(err => console.warn('[UsageBanner]', err));
        return () => { cancelled = true; };
    }, [getMonthlyUsage]);

    if (!usage) return null;

    const queriesLimit = usage.queries.limit;
    const docsLimit = usage.docs.limit;

    // -1 (unlimited) or undefined (legacy plan) → don't show that bar
    const showQueries = queriesLimit !== undefined && queriesLimit >= 0;
    const showDocs = docsLimit !== undefined && docsLimit >= 0;
    if (!showQueries && !showDocs) return null;

    const queryPct = showQueries && queriesLimit > 0
        ? Math.min(100, Math.round((usage.queries.current / queriesLimit) * 100))
        : 0;
    const docsPct = showDocs && docsLimit > 0
        ? Math.min(100, Math.round((usage.docs.current / docsLimit) * 100))
        : 0;

    const isCritical = queryPct >= 100 || docsPct >= 100;
    const isWarning = !isCritical && (queryPct >= 80 || docsPct >= 80);

    return (
        <div className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6 min-w-0 flex-wrap">
                {showQueries && (
                    <QuotaBar
                        icon={MessageSquare}
                        label={t('usage.queriesLabel')}
                        current={usage.queries.current}
                        limit={queriesLimit}
                        pct={queryPct}
                    />
                )}
                {showDocs && (
                    <QuotaBar
                        icon={FileText}
                        label={t('usage.docsLabel')}
                        current={usage.docs.current}
                        limit={docsLimit}
                        pct={docsPct}
                    />
                )}
            </div>
            {(isCritical || isWarning) && (
                <Button
                    size="sm"
                    variant={isCritical ? 'default' : 'outline'}
                    onClick={() => navigate('/dashboard/subscription')}
                    className="shrink-0"
                >
                    {t('usage.upgradeButton')}
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

interface QuotaBarProps {
    icon: typeof MessageSquare;
    label: string;
    current: number;
    limit: number;
    pct: number;
}

function QuotaBar({ icon: Icon, label, current, limit, pct }: QuotaBarProps) {
    const tone = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary';
    return (
        <div className="flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                <span className="font-medium">{label}</span>
                <span className="ml-auto tabular-nums text-foreground">
                    {current.toLocaleString()} / {limit.toLocaleString()}
                </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full ${tone} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
