import { Card } from '@/components/ui/card';
import { Users, UserCheck, Clock, TrendingUp, DollarSign, Target } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useMemo } from 'react';
import type { User } from '@dosfilos/domain';

interface Props {
    users: User[];
}

interface PlanPricing {
    monthly: number;
}

// Default pricing fallbacks if a plan doc isn't loaded — keeps the MRR
// estimate ballpark-correct without blocking the UI on plan fetches.
const FALLBACK_PRICING: Record<string, PlanPricing> = {
    free: { monthly: 0 },
    basic: { monthly: 9 },
    pro: { monthly: 14.99 },
    team: { monthly: 44.99 },
    enterprise: { monthly: 0 },
};

/**
 * KPI strip for the User Management page. Shows:
 *   - Total — every account in the system
 *   - Subscribers — paid + active subscriptions (the MRR contributors)
 *   - Trialing — active trials
 *   - New this month — counter with delta vs prior month
 *   - Estimated MRR — sum of monthly pricing across paid subscriptions
 *   - Conversion — paying / addressable (excludes disabled)
 *
 * The "Subscribers" label intentionally avoids the word "Active" — at MVP scale
 * most accounts are Free and read as "active" in the table column, which made
 * an "Active: 1" KPI look like a bug to non-technical viewers.
 *
 * MRR is a "good enough" estimate using fallback pricing; for accounting use
 * the Stripe dashboard. The point here is at-a-glance health, not GAAP.
 */
export function UserStatsHeader({ users }: Props) {
    const { t } = useTranslation('admin');

    const stats = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        let subscribers = 0;
        let trialing = 0;
        let disabled = 0;
        let newThisMonth = 0;
        let newLastMonth = 0;
        let mrr = 0;

        for (const u of users) {
            const status = u.subscription?.status;
            const isDisabled = u.status === 'disabled';

            if (isDisabled) disabled++;
            else if (status === 'trialing') trialing++;
            else if (status === 'active') subscribers++;

            if (u.createdAt >= monthStart) newThisMonth++;
            else if (u.createdAt >= lastMonthStart) newLastMonth++;

            // MRR: only count active (not trialing, not disabled, not cancelled)
            // paid subscriptions. Free plan contributes $0.
            if (!isDisabled && status === 'active') {
                const planId = u.subscription?.planId ?? 'free';
                const fallback = FALLBACK_PRICING[planId];
                if (fallback) mrr += fallback.monthly;
            }
        }

        const monthDelta = newThisMonth - newLastMonth;
        const addressable = users.length - disabled;
        // Below ~25 users a percentage looks misleading either way (10% from
        // 1/10 reads as weak; 50% from 1/2 reads as inflated). Show the raw
        // ratio at small scale and the percentage once the denominator stabilizes.
        const conversionDisplay = addressable === 0
            ? '—'
            : addressable < 25
                ? `${subscribers}/${addressable}`
                : `${Math.round((subscribers / addressable) * 100)}%`;

        return {
            total: users.length,
            subscribers,
            trialing,
            disabled,
            addressable,
            newThisMonth,
            monthDelta,
            mrr,
            conversionDisplay,
        };
    }, [users]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard
                icon={Users}
                label={t('users.stats.total')}
                value={stats.total.toLocaleString()}
                tone="text-foreground"
            />
            <StatCard
                icon={UserCheck}
                label={t('users.stats.subscribers')}
                value={stats.subscribers.toLocaleString()}
                tone="text-success"
                hint={t('users.stats.subscribersHint')}
            />
            <StatCard
                icon={Clock}
                label={t('users.stats.trialing')}
                value={stats.trialing.toLocaleString()}
                tone="text-warning"
            />
            <StatCard
                icon={TrendingUp}
                label={t('users.stats.newThisMonth')}
                value={stats.newThisMonth.toLocaleString()}
                tone="text-primary"
                delta={stats.monthDelta}
            />
            <StatCard
                icon={DollarSign}
                label={t('users.stats.mrr')}
                value={`$${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                tone="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
                icon={Target}
                label={t('users.stats.conversion')}
                value={stats.conversionDisplay}
                tone="text-info"
                hint={t('users.stats.conversionHint', { paying: stats.subscribers, total: stats.addressable })}
            />
        </div>
    );
}

interface StatCardProps {
    icon: any;
    label: string;
    value: string;
    tone: string;
    delta?: number;
    hint?: string;
}

function StatCard({ icon: Icon, label, value, tone, delta, hint }: StatCardProps) {
    return (
        <Card className="p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
            {typeof delta === 'number' && delta !== 0 && (
                <div className={`text-[11px] tabular-nums mt-0.5 ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
                    {delta > 0 ? '+' : ''}{delta} vs last month
                </div>
            )}
            {hint && typeof delta !== 'number' && (
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={hint}>
                    {hint}
                </div>
            )}
        </Card>
    );
}
