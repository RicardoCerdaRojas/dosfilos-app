import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Sparkles, Zap, ArrowUpRight } from 'lucide-react';
import { processingBalanceService } from '@dosfilos/application';
import type { ProcessingBalance } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useFirebase } from '@/context/firebase-context';

interface MonthlyUsage {
    docs: { current: number; limit?: number };
    pagesProcessed: { current: number; limit?: number };
    queries: { current: number; limit?: number };
    periodKey: string;
}

/**
 * Top-of-Library quota strip.
 *
 * Pre-redesign this banner showed `docs.current / docs.limit` (e.g.
 * "32 / 500") and `queries.current / queriesLimit`. The docs metric was
 * misleading: the actual upload gate checks `processingBalance` (pages
 * pre-paid in the plan + pack), not document count. Users would see
 * "468 docs left" and then bounce off a "buy pages" modal at upload time.
 *
 * The redesigned banner exposes the metric the gate actually uses:
 * standard + premium pages available right now (plan bucket + pack
 * bucket combined). The plan/pack split is shown as a sub-text per
 * column so the user can tell where the balance comes from. Queries
 * stays as the second metric because it's still a separate cap.
 */
export function UsageBanner() {
    const { t } = useTranslation('library');
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { getMonthlyUsage } = useUsageLimits();
    const [usage, setUsage] = useState<MonthlyUsage | null>(null);
    const [balance, setBalance] = useState<ProcessingBalance | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getMonthlyUsage(),
            user?.uid ? processingBalanceService.getBalance(user.uid) : Promise.resolve(null),
        ])
            .then(([u, b]) => {
                if (cancelled) return;
                if (u) setUsage(u);
                if (b) setBalance(b);
            })
            .catch(err => console.warn('[UsageBanner]', err));
        return () => { cancelled = true; };
    }, [getMonthlyUsage, user?.uid]);

    if (!usage || !balance) return null;

    const queriesLimit = usage.queries.limit;
    const showQueries = queriesLimit !== undefined && queriesLimit >= 0;
    const queryPct = showQueries && queriesLimit > 0
        ? Math.min(100, Math.round((usage.queries.current / queriesLimit) * 100))
        : 0;

    // "At risk" thresholds for the upgrade CTA. Pages: any mode with the
    // PLAN bucket below 20% (the user is using up the included quota,
    // unrelated to packs). Queries: percentage of monthly cap.
    const standardPlanLow = balance.planStandardPages > 0
        && balance.planStandardPages < 200;
    const premiumPlanLow = balance.planPremiumPages > 0
        && balance.planPremiumPages < 20;
    const isCritical = (showQueries && queryPct >= 100)
        || (balance.standardPagesAvailable === 0 && balance.premiumPagesAvailable === 0);
    const isWarning = !isCritical
        && ((showQueries && queryPct >= 80) || standardPlanLow || premiumPlanLow);

    return (
        <div className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6 min-w-0 flex-wrap">
                <PageBalanceColumn
                    icon={Zap}
                    label={t('usage.standardPagesLabel')}
                    plan={balance.planStandardPages}
                    pack={balance.packStandardPages}
                    total={balance.standardPagesAvailable}
                    isLow={standardPlanLow || balance.standardPagesAvailable === 0}
                    splitLabel={t('usage.balanceSplit')}
                />
                <PageBalanceColumn
                    icon={Sparkles}
                    label={t('usage.premiumPagesLabel')}
                    plan={balance.planPremiumPages}
                    pack={balance.packPremiumPages}
                    total={balance.premiumPagesAvailable}
                    isLow={premiumPlanLow || balance.premiumPagesAvailable === 0}
                    splitLabel={t('usage.balanceSplit')}
                />
                {showQueries && (
                    <QueriesColumn
                        label={t('usage.queriesLabel')}
                        current={usage.queries.current}
                        limit={queriesLimit}
                        pct={queryPct}
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

interface PageBalanceColumnProps {
    icon: typeof Zap;
    label: string;
    plan: number;
    pack: number;
    total: number;
    isLow: boolean;
    splitLabel: string;
}

function PageBalanceColumn({ icon: Icon, label, plan, pack, total, isLow, splitLabel }: PageBalanceColumnProps) {
    const tone = total === 0
        ? 'text-destructive'
        : isLow
            ? 'text-warning'
            : 'text-foreground';
    return (
        <div className="flex flex-col gap-0.5 min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                <span className="font-medium">{label}</span>
            </div>
            <p className={`text-lg font-semibold tabular-nums ${tone}`}>
                {total.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
                {splitLabel
                    .replace('{{plan}}', plan.toLocaleString())
                    .replace('{{pack}}', pack.toLocaleString())}
            </p>
        </div>
    );
}

interface QueriesColumnProps {
    label: string;
    current: number;
    limit: number;
    pct: number;
}

function QueriesColumn({ label, current, limit, pct }: QueriesColumnProps) {
    const tone = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary';
    return (
        <div className="flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
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
