import type { User } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CreditCard, ExternalLink, AlertTriangle, Clock, Calendar, RotateCw, XCircle,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { format } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

interface Props {
    user: User;
}

const STATUS_TONE: Record<string, string> = {
    active:     'bg-success/15 text-success border-success/30',
    trialing:   'bg-warning/15 text-warning border-warning/30',
    past_due:   'bg-destructive/15 text-destructive border-destructive/30',
    cancelled:  'bg-muted text-muted-foreground border-muted-foreground/30',
    incomplete: 'bg-warning/15 text-warning border-warning/30',
};

export function SubscriptionTab({ user }: Props) {
    const { t, i18n } = useTranslation('admin');
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;
    const sub = user.subscription;

    const fmt = (d?: Date) => d ? format(d, 'PPP', { locale: dateLocale }) : '—';

    if (!sub) {
        return (
            <Card className="p-12 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('users.subscription.none')}</p>
            </Card>
        );
    }

    const stripeUrl = user.stripeCustomerId
        ? `https://dashboard.stripe.com/customers/${user.stripeCustomerId}`
        : null;

    const failedAttempts = sub.failedPaymentAttempts ?? 0;

    return (
        <div className="space-y-6">
            <Card className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-sm font-bold">
                                {sub.planId.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={STATUS_TONE[sub.status] ?? ''}>
                                {t(`users.subscription.status.${sub.status}`, { defaultValue: sub.status })}
                            </Badge>
                            {sub.cancelAtPeriodEnd && (
                                <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {t('users.subscription.cancelAtPeriodEnd')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            ID: <code className="font-mono text-xs">{sub.id || '—'}</code>
                        </p>
                    </div>
                    {stripeUrl && (
                        <Button variant="outline" size="sm" asChild>
                            <a href={stripeUrl} target="_blank" rel="noreferrer">
                                {t('users.subscription.openStripe')}
                                <ExternalLink className="h-3 w-3 ml-1.5" />
                            </a>
                        </Button>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow
                    icon={Calendar}
                    label={t('users.subscription.startDate')}
                    value={fmt(sub.startDate)}
                />
                <DetailRow
                    icon={RotateCw}
                    label={t('users.subscription.currentPeriod')}
                    value={`${fmt(sub.currentPeriodStart)} → ${fmt(sub.currentPeriodEnd)}`}
                />
                {sub.trialEnd && (
                    <DetailRow
                        icon={Clock}
                        label={t('users.subscription.trialEnd')}
                        value={fmt(sub.trialEnd)}
                        tone="text-warning"
                    />
                )}
                {sub.cancelledAt && (
                    <DetailRow
                        icon={XCircle}
                        label={t('users.subscription.cancelledAt')}
                        value={fmt(sub.cancelledAt)}
                        tone="text-destructive"
                    />
                )}
                {sub.gracePeriodEnd && (
                    <DetailRow
                        icon={Clock}
                        label={t('users.subscription.gracePeriodEnd')}
                        value={fmt(sub.gracePeriodEnd)}
                        tone="text-warning"
                    />
                )}
            </div>

            {(failedAttempts > 0 || sub.lastPaymentError) && (
                <Card className="p-4 border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <h3 className="font-semibold text-destructive">
                            {t('users.subscription.paymentIssues')}
                        </h3>
                    </div>
                    {failedAttempts > 0 && (
                        <p className="text-sm text-destructive mb-1">
                            {t('users.subscription.failedAttempts', { count: failedAttempts })}
                        </p>
                    )}
                    {sub.lastPaymentError && (
                        <div className="text-sm text-destructive/90 mt-2">
                            <div className="text-xs text-muted-foreground mb-0.5">
                                {fmt(sub.lastPaymentError.attemptedAt)}
                            </div>
                            <code className="font-mono text-xs">{sub.lastPaymentError.message}</code>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

interface DetailRowProps {
    icon: any;
    label: string;
    value: string;
    tone?: string;
}

function DetailRow({ icon: Icon, label, value, tone }: DetailRowProps) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider font-bold text-muted-foreground">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <div className={`text-base font-medium tabular-nums ${tone ?? 'text-foreground'}`}>
                {value}
            </div>
        </Card>
    );
}
