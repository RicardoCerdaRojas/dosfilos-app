import { useUserUsage } from '@/hooks/admin/useUserUsage';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, MessageSquare, Upload, Coins } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { User } from '@dosfilos/domain';

interface Props {
    user: User;
}

export function UsageTab({ user }: Props) {
    const { t } = useTranslation('admin');
    const { data, loading, error } = useUserUsage(user.id, user.subscription?.planId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="p-12 text-center">
                <p className="text-muted-foreground">{error ?? t('users.usage.loadError')}</p>
            </Card>
        );
    }

    const { usage, plan } = data;
    const limits = plan?.limits;
    const balance = user.processingBalance;

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                    {t('users.usage.period')}
                </div>
                <div className="text-lg font-semibold tabular-nums">{usage.periodKey}</div>
                <div className="text-xs text-muted-foreground mt-1">
                    {t('users.usage.planLabel', { plan: plan?.name ?? user.subscription?.planId ?? '—' })}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuotaCard
                    icon={FileText}
                    label={t('users.usage.pagesProcessed')}
                    used={usage.pagesProcessed}
                    limit={limits?.pagesProcessedPerMonth}
                    hint={t('users.usage.pagesHint')}
                />
                <QuotaCard
                    icon={MessageSquare}
                    label={t('users.usage.queriesUsed')}
                    used={usage.queriesUsed}
                    limit={limits?.queriesPerMonth}
                    hint={t('users.usage.queriesHint')}
                />
                <QuotaCard
                    icon={Upload}
                    label={t('users.usage.docsUploaded')}
                    used={usage.docsUploadedThisMonth}
                    limit={limits?.libraryDocsLimit}
                    hint={t('users.usage.docsHint')}
                />
            </div>

            {balance && (
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Coins className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{t('users.usage.balance.title')}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <BalanceItem
                            label={t('users.usage.balance.standardAvailable')}
                            value={balance.standardPagesAvailable}
                            tone="text-success"
                        />
                        <BalanceItem
                            label={t('users.usage.balance.premiumAvailable')}
                            value={balance.premiumPagesAvailable}
                            tone="text-info"
                        />
                        <BalanceItem
                            label={t('users.usage.balance.standardSpent')}
                            value={balance.standardSpentTotal}
                            tone="text-muted-foreground"
                        />
                        <BalanceItem
                            label={t('users.usage.balance.premiumSpent')}
                            value={balance.premiumSpentTotal}
                            tone="text-muted-foreground"
                        />
                    </div>
                </Card>
            )}
        </div>
    );
}

interface QuotaCardProps {
    icon: any;
    label: string;
    used: number;
    limit?: number;
    hint?: string;
}

function QuotaCard({ icon: Icon, label, used, limit, hint }: QuotaCardProps) {
    const { t } = useTranslation('admin');

    // -1 sentinel = unlimited; undefined = no quota for this plan.
    const unlimited = limit === -1;
    const noQuota = limit === undefined;
    const pct = unlimited || noQuota || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
    const tone =
        pct >= 100 ? 'bg-destructive' :
        pct >= 80  ? 'bg-warning' :
                     'bg-primary';

    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">{used.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">
                    {unlimited
                        ? `/ ${t('users.usage.unlimited')}`
                        : noQuota
                            ? `/ ${t('users.usage.noQuota')}`
                            : `/ ${limit?.toLocaleString()}`}
                </span>
            </div>
            {!unlimited && !noQuota && (
                <>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full ${tone} transition-all`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-[11px] text-muted-foreground tabular-nums">
                        <span>{pct}%</span>
                        {limit !== undefined && limit > 0 && (
                            <span>{t('users.usage.remaining', { count: Math.max(0, limit - used) })}</span>
                        )}
                    </div>
                </>
            )}
            {hint && (
                <div className="text-[11px] text-muted-foreground mt-2">{hint}</div>
            )}
        </Card>
    );
}

function BalanceItem({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold tabular-nums ${tone}`}>{value.toLocaleString()}</div>
        </div>
    );
}
