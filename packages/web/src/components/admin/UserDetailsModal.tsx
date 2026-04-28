import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    User as UserIcon,
    Mail,
    Calendar,
    CreditCard,
    Activity,
    BookOpen,
    LogIn,
    Award,
    Eye,
    EyeOff,
} from 'lucide-react';
import { formatDateLong, formatRelativeTime, formatCurrency } from '@/utils/formatters';
import { calculateEngagementScore, getEngagementLevel } from '@/utils/engagementScore';
import { useTranslation } from '@/i18n';
import type { User } from '@dosfilos/domain';

interface UserDetailsModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onChangePlan?: (userId: string) => void;
    onGrantCredits?: (userId: string) => void;
    onExtendTrial?: (userId: string) => void;
    onViewAuditLog?: (userId: string) => void;
}

/**
 * Helper to safely convert Firestore Timestamp or Date to Date object.
 */
function toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string') return new Date(value);
    return null;
}

export function UserDetailsModal({
    user, isOpen, onClose, onChangePlan,
    onGrantCredits, onExtendTrial, onViewAuditLog,
}: UserDetailsModalProps) {
    const { t } = useTranslation('admin');
    const [showSensitive, setShowSensitive] = useState(false);

    if (!user) return null;

    const engagementScore = calculateEngagementScore(user.analytics);
    const engagementLevel = getEngagementLevel(engagementScore);

    const trialEnd = toDate(user.subscription?.trialEnd);
    const trialActive = trialEnd && trialEnd.getTime() > Date.now();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-5xl max-h-[90vh] overflow-y-auto"
                style={{ width: '85vw', maxWidth: '1200px' }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <UserIcon className="h-6 w-6" />
                        {t('users.details.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('users.details.description', { name: user.displayName || user.email })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Basic Info */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
                            {t('users.details.sections.basic')}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.name')}
                                </p>
                                <p className="font-medium">{user.displayName || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.email')}
                                </p>
                                <p className="font-medium flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {user.email}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.created')}
                                </p>
                                <p className="font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {toDate(user.createdAt) ? formatDateLong(toDate(user.createdAt)!) : '—'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Subscription Info */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            {t('users.details.sections.subscription')}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.plan')}
                                </p>
                                <Badge
                                    className="mt-1"
                                    variant={user.subscription?.planId === 'free' ? 'secondary' : 'default'}
                                >
                                    {user.subscription?.planId || 'free'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.status')}
                                </p>
                                <Badge
                                    className="mt-1"
                                    variant={user.subscription?.status === 'active' ? 'default' : 'secondary'}
                                >
                                    {user.subscription?.status || '—'}
                                </Badge>
                            </div>
                            {user.subscription?.startDate && (
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.startDate')}
                                    </p>
                                    <p className="font-medium">
                                        {formatDateLong(toDate(user.subscription.startDate)!)}
                                    </p>
                                </div>
                            )}
                            {user.subscription?.currentPeriodEnd && (
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.nextBilling')}
                                    </p>
                                    <p className="font-medium">
                                        {formatDateLong(toDate(user.subscription.currentPeriodEnd)!)}
                                    </p>
                                </div>
                            )}
                            {trialEnd && (
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.trialEnd')}
                                    </p>
                                    <p className={`font-medium ${trialActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                        {trialActive
                                            ? t('users.details.trialActive', { when: formatRelativeTime(trialEnd) })
                                            : t('users.details.trialExpired', { when: formatRelativeTime(trialEnd) })}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {onChangePlan && (
                                <Button variant="outline" size="sm" onClick={() => onChangePlan(user.id)}>
                                    {t('users.details.changePlanButton')}
                                </Button>
                            )}
                            {onExtendTrial && (
                                <Button variant="outline" size="sm" onClick={() => onExtendTrial(user.id)}>
                                    {t('users.extendTrialDialog.confirm')}
                                </Button>
                            )}
                            {onGrantCredits && (
                                <Button variant="outline" size="sm" onClick={() => onGrantCredits(user.id)}>
                                    {t('users.grantCreditsDialog.confirm')}
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Analytics & Engagement */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {t('users.details.sections.activity')}
                        </h3>

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.engagementScore')}
                                </span>
                                <Badge
                                    variant={
                                        engagementLevel === 'high' ? 'default' :
                                        engagementLevel === 'medium' ? 'secondary' :
                                        'outline'
                                    }
                                >
                                    {engagementScore} / 100 — {engagementLevel}
                                </Badge>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        engagementLevel === 'high' ? 'bg-green-500' :
                                        engagementLevel === 'medium' ? 'bg-yellow-500' :
                                        'bg-orange-500'
                                    }`}
                                    style={{ width: `${engagementScore}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    <LogIn className="h-4 w-4" />
                                    {t('users.details.fields.totalLogins')}
                                </p>
                                <p className="text-2xl font-bold">
                                    {user.analytics?.loginCount || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    {t('users.details.fields.sermonsCreated')}
                                </p>
                                <p className="text-2xl font-bold">
                                    {user.analytics?.sermonsCreated || 0}
                                </p>
                            </div>
                            {user.analytics?.lastLoginAt && (
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.lastLogin')}
                                    </p>
                                    <p className="font-medium">
                                        {formatRelativeTime(toDate(user.analytics.lastLoginAt)!)}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatDateLong(toDate(user.analytics.lastLoginAt)!)}
                                    </p>
                                </div>
                            )}
                            {user.analytics?.lastActivityAt && (
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.lastActivity')}
                                    </p>
                                    <p className="font-medium">
                                        {formatRelativeTime(toDate(user.analytics.lastActivityAt)!)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Revenue Info (for paid users) */}
                    {(user.analytics as any)?.totalRevenue && (user.analytics as any).totalRevenue > 0 && (
                        <Card className="p-4">
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                {t('users.details.sections.revenue')}
                            </h3>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {t('users.details.fields.totalRevenue')}
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatCurrency((user.analytics as any).totalRevenue)}
                                </p>
                            </div>
                        </Card>
                    )}

                    {/* Sensitive identifiers — hidden behind a toggle so casual
                        screenshots don't leak Stripe/Firebase IDs. */}
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{t('users.details.sections.sensitive')}</h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowSensitive(s => !s)}
                            >
                                {showSensitive ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                                {showSensitive ? t('users.details.hideSensitive') : t('users.details.showSensitive')}
                            </Button>
                        </div>
                        {showSensitive && (
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t('users.details.fields.userId')}
                                    </p>
                                    <p className="font-mono text-xs break-all">{user.id}</p>
                                </div>
                                {user.stripeCustomerId && (
                                    <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {t('users.details.fields.stripeCustomerId')}
                                        </p>
                                        <p className="font-mono text-xs break-all">{user.stripeCustomerId}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="flex justify-between gap-2 mt-6">
                    {onViewAuditLog ? (
                        <Button variant="ghost" onClick={() => onViewAuditLog(user.id)}>
                            {t('audit.viewForUser')}
                        </Button>
                    ) : <span />}
                    <Button variant="outline" onClick={onClose}>
                        {t('users.details.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
