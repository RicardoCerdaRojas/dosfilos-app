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

const FALLBACK_PRICING: Record<string, PlanPricing> = {
    free: { monthly: 0 },
    basic: { monthly: 9 },
    pro: { monthly: 14.99 },
    team: { monthly: 44.99 },
    enterprise: { monthly: 0 },
};

/**
 * KPI strip for User Management. Hero (Total · Subscribers · MRR) carries the
 * primary at-a-glance health; secondaries (Trial · New · Conversion) sit at
 * caption weight on the right of the same strip so the dashboard stays one
 * row tall instead of two cards' worth of vertical chrome.
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

            if (!isDisabled && status === 'active') {
                const planId = u.subscription?.planId ?? 'free';
                const fallback = FALLBACK_PRICING[planId];
                if (fallback) mrr += fallback.monthly;
            }
        }

        const monthDelta = newThisMonth - newLastMonth;
        const addressable = users.length - disabled;
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
        <div className="bg-card border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <HeroStat
                    icon={Users}
                    label={t('users.stats.total')}
                    value={stats.total.toLocaleString()}
                    tone="text-foreground"
                />
                <HeroStat
                    icon={UserCheck}
                    label={t('users.stats.subscribers')}
                    value={stats.subscribers.toLocaleString()}
                    tone="text-success"
                    hint={t('users.stats.subscribersHint')}
                />
                <HeroStat
                    icon={DollarSign}
                    label={t('users.stats.mrr')}
                    value={`$${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    tone="text-success"
                />
                <SecondaryStat
                    icon={Clock}
                    label={t('users.stats.trialing')}
                    value={stats.trialing.toLocaleString()}
                    tone="text-warning"
                />
                <SecondaryStat
                    icon={TrendingUp}
                    label={t('users.stats.newThisMonth')}
                    value={stats.newThisMonth.toLocaleString()}
                    tone="text-primary"
                    delta={stats.monthDelta}
                />
                <SecondaryStat
                    icon={Target}
                    label={t('users.stats.conversion')}
                    value={stats.conversionDisplay}
                    tone="text-info"
                    hint={t('users.stats.conversionHint', { paying: stats.subscribers, total: stats.addressable })}
                />
            </div>
        </div>
    );
}

interface StatProps {
    icon: any;
    label: string;
    value: string;
    tone: string;
    delta?: number;
    hint?: string;
}

/**
 * Type hierarchy on this page (top → bottom in visual weight):
 *   1. Page H1 ("Gestión de Usuarios") — text-3xl bold
 *   2. KPI hero value (Total, Subscribers, MRR) — text-2xl bold
 *   3. KPI secondary value (Trial, New, Conversion) — text-lg semibold
 *   4. Table headers — text-xs uppercase tracking-wider semibold
 *   5. Row content — text-sm / font-medium for primary, muted for hints
 * Hero stays smaller than H1 so the page identity wins the eye first; secondaries
 * stay clearly below hero so the strip reads as 3+3 rather than 6 flat numbers.
 */
function HeroStat({ icon: Icon, label, value, tone, hint }: StatProps) {
    return (
        <div className="px-6 py-5 space-y-2">
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${tone}`} />
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums leading-none ${tone}`}>{value}</p>
            {hint && (
                <p className="text-xs text-muted-foreground truncate" title={hint}>{hint}</p>
            )}
        </div>
    );
}

function SecondaryStat({ icon: Icon, label, value, tone, delta, hint }: StatProps) {
    return (
        <div className="px-6 py-5 space-y-2">
            <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${tone}`} />
                <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{label}</p>
            </div>
            <p className={`text-lg font-semibold tabular-nums leading-none ${tone}`}>{value}</p>
            {typeof delta === 'number' && delta !== 0 && (
                <p className={`text-xs tabular-nums ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
                    {delta > 0 ? '+' : ''}{delta} vs last month
                </p>
            )}
            {hint && typeof delta !== 'number' && (
                <p className="text-xs text-muted-foreground truncate" title={hint}>{hint}</p>
            )}
        </div>
    );
}
