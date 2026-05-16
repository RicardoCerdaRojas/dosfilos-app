import React from 'react';
import {
    Activity, CreditCard, Eye, Loader2, Mail, Trash2, User as UserIcon,
    UserCheck, UserX, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    const statusTone =
        isDisabled ? 'bg-destructive/10 text-destructive border-destructive/30' :
        status === 'active' ? 'bg-success-subtle text-success-subtle-foreground border-success/30' :
        status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/30' :
        status === 'trialing' ? 'bg-warning-subtle text-warning-subtle-foreground border-warning/30' :
        'bg-warning-subtle text-warning-subtle-foreground border-warning/30';

    const trialEnd = asDate(user.subscription?.trialEnd);
    const trialActive = trialEnd && trialEnd.getTime() > Date.now();
    const lastLogin = asDate(user.analytics?.lastLoginAt);

    return (
        <TableRow className={`[&_td]:py-4 ${isSelected ? 'bg-muted/40' : 'hover:bg-muted/50'}`}>
            <TableCell className="w-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) => onToggleSelected(user.id, c === true)}
                    aria-label={t('users.table.selectAria', { email: user.email })}
                />
            </TableCell>

            {/* Identity: avatar + name + email + plan chip + status pill — 4 facts in 1 column.
                Replaces the prior Usuario / Plan / Estado triplet so the table loses ~3 columns
                of horizontal pressure without losing information density. */}
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                                {user.displayName || t('users.table.noName')}
                            </p>
                            <PlanBadge planId={user.subscription?.planId || 'free'} />
                            <span className={`text-[10px] uppercase tracking-wide font-semibold rounded-sm px-1.5 py-0.5 border ${statusTone}`}>
                                {status}
                            </span>
                            {isDisabled && (
                                <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive">
                                    {t('users.table.disabledBadge')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        {trialEnd && (
                            <p className={`text-[11px] ${trialActive ? 'text-warning' : 'text-muted-foreground'}`}>
                                {trialActive
                                    ? t('users.table.trialEndsIn', {
                                        when: formatDistanceToNow(trialEnd, { addSuffix: true, locale: dateLocale }),
                                    })
                                    : t('users.table.trialEnded')}
                            </p>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell>
                <div className="text-sm">
                    <p className="font-medium text-foreground tabular-nums">
                        {t('users.table.sermonsCount', { count: user.analytics?.sermonsCreated || 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
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

            <TableCell className="text-sm text-muted-foreground tabular-nums">
                {lastLogin
                    ? formatDistanceToNow(lastLogin, { addSuffix: true, locale: dateLocale })
                    : t('users.table.neverLogged')}
            </TableCell>

            <TableCell className="text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(user)}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('users.rowActions.view')}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={t('users.rowActions.more')}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => onViewActivity(user.id)}>
                                <Activity className="h-4 w-4 mr-2" />
                                {t('users.rowActions.activity')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onChangePlan(user)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                {t('users.rowActions.changePlan')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => onResendEmail(user.id, user.email)}
                                disabled={isResending}
                            >
                                {isResending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                                {t('users.rowActions.resendEmail')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isDisabled ? (
                                <DropdownMenuItem
                                    onSelect={() => onEnable(user)}
                                    disabled={isEnabling}
                                    className="text-success focus:text-success"
                                >
                                    {isEnabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                                    {t('users.rowActions.enable')}
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onSelect={() => onDisable(user)}
                                    disabled={isDisabling}
                                    className="text-warning focus:text-warning"
                                >
                                    {isDisabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-4 w-4 mr-2" />}
                                    {t('users.rowActions.disable')}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onSelect={() => onDelete(user)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('users.rowActions.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
    );
};
