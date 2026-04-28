import React from 'react';
import {
    Activity, CreditCard, Eye, Loader2, Mail, Trash2, User as UserIcon,
    UserCheck, UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/i18n';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';
import { calculateEngagementScore } from '@/utils/engagementScore';
import { PlanBadge } from '@/components/admin/PlanBadge';
import { EngagementBadge } from '@/components/admin/EngagementBadge';
import type { User } from '@dosfilos/domain';

interface UserTableRowProps {
    user: User;
    isResending: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isSelected: boolean;
    onToggleSelected: (id: string, selected: boolean) => void;
    onViewActivity: (id: string) => void;
    onViewDetails: (user: User) => void;
    onChangePlan: (user: User) => void;
    onResendEmail: (id: string, email: string) => void;
    onEnable: (user: User) => void;
    onDisable: (user: User) => void;
    onDelete: (user: User) => void;
}

/**
 * Coerces a value that might be a Date, Firestore Timestamp, or undefined
 * into a Date — keeps the row defensive against mixed shapes coming through
 * the snapshot listener vs an admin-typed mutation.
 */
function asDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    return null;
}

export const UserTableRow: React.FC<UserTableRowProps> = ({
    user,
    isResending,
    isEnabling,
    isDisabling,
    isSelected,
    onToggleSelected,
    onViewActivity,
    onViewDetails,
    onChangePlan,
    onResendEmail,
    onEnable,
    onDisable,
    onDelete,
}) => {
    const { t, i18n } = useTranslation('admin');
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;
    const status = user.subscription?.status || t('users.table.defaultStatus');
    const isDisabled = user.status === 'disabled';
    const statusClass =
        isDisabled ? 'text-destructive' :
        status === 'active' ? 'text-success' :
        status === 'cancelled' ? 'text-destructive' :
        status === 'trialing' ? 'text-warning' :
        'text-warning';

    const trialEnd = asDate(user.subscription?.trialEnd);
    const trialActive = trialEnd && trialEnd.getTime() > Date.now();

    const lastLogin = asDate(user.analytics?.lastLoginAt);
    const createdAt = asDate(user.createdAt);

    return (
        <TableRow className={isSelected ? 'bg-muted/40' : 'hover:bg-muted/50'}>
            <TableCell className="w-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) => onToggleSelected(user.id, c === true)}
                    aria-label={t('users.table.selectAria', { email: user.email })}
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName || user.email}
                                className="h-10 w-10 rounded-full"
                            />
                        ) : (
                            <UserIcon className="h-5 w-5 text-primary" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{user.displayName || t('users.table.noName')}</p>
                            {isDisabled && (
                                <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive">
                                    {t('users.table.disabledBadge')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <PlanBadge planId={user.subscription?.planId || 'free'} />
            </TableCell>
            <TableCell>
                <span className={`text-sm ${statusClass}`}>{status}</span>
                {trialEnd && (
                    <p className={`text-[11px] mt-0.5 ${trialActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {trialActive
                            ? t('users.table.trialEndsIn', {
                                when: formatDistanceToNow(trialEnd, { addSuffix: true, locale: dateLocale }),
                            })
                            : t('users.table.trialEnded')}
                    </p>
                )}
            </TableCell>
            <TableCell>
                <div className="text-sm">
                    <p className="font-medium text-foreground">
                        {t('users.table.sermonsCount', { count: user.analytics?.sermonsCreated || 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('users.table.tutorAndDrafts', {
                            greek: user.analytics?.greekTutorSessions || 0,
                            drafts: user.analytics?.seriesCreated || 0,
                        })}
                    </p>
                </div>
            </TableCell>
            <TableCell>
                <EngagementBadge score={calculateEngagementScore(user.analytics)} showScore />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                {lastLogin
                    ? formatDistanceToNow(lastLogin, { addSuffix: true, locale: dateLocale })
                    : t('users.table.neverLogged')}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                {createdAt
                    ? createdAt.toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })
                    : '—'}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewActivity(user.id)}
                        title={t('users.rowActions.viewActivity')}
                    >
                        <Activity className="h-4 w-4 mr-1" />
                        {t('users.rowActions.activity')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onViewDetails(user)}>
                        <Eye className="h-4 w-4 mr-1" />
                        {t('users.rowActions.view')}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onChangePlan(user)}
                        title={t('users.rowActions.changePlan')}
                    >
                        <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onResendEmail(user.id, user.email)}
                        disabled={isResending}
                        title={t('users.rowActions.resendEmail')}
                    >
                        {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    </Button>
                    {isDisabled ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => onEnable(user)}
                            disabled={isEnabling}
                            title={t('users.rowActions.enable')}
                        >
                            {isEnabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-warning hover:text-warning hover:bg-warning/10"
                            onClick={() => onDisable(user)}
                            disabled={isDisabling}
                            title={t('users.rowActions.disable')}
                        >
                            {isDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(user)}
                        title={t('users.rowActions.delete')}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};
