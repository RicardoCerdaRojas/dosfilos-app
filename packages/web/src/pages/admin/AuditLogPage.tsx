import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useAuditLog, type AuditAction, type AuditLogEntry } from '@/hooks/admin/useAuditLog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft, Loader2, Search, ScrollText, Trash2, UserX, UserCheck,
    Mail, CreditCard, Plus, Calendar as CalendarIcon, Layers,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

const ACTION_FILTER_VALUES: Array<AuditAction | 'all'> = [
    'all',
    'user.delete', 'user.disable', 'user.enable',
    'user.change_plan', 'user.grant_credits', 'user.extend_trial',
    'user.resend_welcome_email',
    'user.bulk_disable', 'user.bulk_enable',
];

/**
 * Visual badge for each action type. Color coded by severity so the admin can
 * scan a long log and immediately see "delete" rows in red.
 */
const ACTION_VISUAL: Record<AuditAction, { icon: any; tone: string }> = {
    'user.delete':                { icon: Trash2,      tone: 'bg-destructive/15 text-destructive border-destructive/30' },
    'user.disable':               { icon: UserX,       tone: 'bg-warning/15 text-warning border-warning/30' },
    'user.enable':                { icon: UserCheck,   tone: 'bg-success/15 text-success border-success/30' },
    'user.resend_welcome_email':  { icon: Mail,        tone: 'bg-info/15 text-info border-info/30' },
    'user.change_plan':           { icon: CreditCard,  tone: 'bg-primary/15 text-primary border-primary/30' },
    'user.bulk_disable':          { icon: Layers,      tone: 'bg-warning/15 text-warning border-warning/30' },
    'user.bulk_enable':           { icon: Layers,      tone: 'bg-success/15 text-success border-success/30' },
    'user.grant_credits':         { icon: Plus,        tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    'user.extend_trial':          { icon: CalendarIcon,tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
};

export function AuditLogPage() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('admin');
    const [searchParams, setSearchParams] = useSearchParams();
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;

    const targetUidParam = searchParams.get('target') || undefined;
    const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>(
        (searchParams.get('action') as AuditAction | 'all') || 'all',
    );
    const [search, setSearch] = useState(searchParams.get('q') || '');

    // Persist filters to URL so the entire view is shareable + sticky-on-refresh.
    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        if (search) next.set('q', search); else next.delete('q');
        if (actionFilter !== 'all') next.set('action', actionFilter); else next.delete('action');
        setSearchParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, actionFilter]);

    const { entries, loading } = useAuditLog({
        targetUid: targetUidParam,
        action: actionFilter !== 'all' ? actionFilter : undefined,
    });

    const visible = useMemo(() => {
        if (!search) return entries;
        const q = search.toLowerCase();
        return entries.filter(e =>
            e.targetEmail?.toLowerCase().includes(q) ||
            e.actorEmail?.toLowerCase().includes(q) ||
            e.targetUid?.toLowerCase().includes(q) ||
            e.actorUid.toLowerCase().includes(q),
        );
    }, [entries, search]);

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[95%] mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/dashboard/admin/users')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('audit.backToUsers')}
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <ScrollText className="h-7 w-7 text-primary" />
                            {t('audit.title')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('audit.subtitle')} · {t('audit.showingCount', { count: visible.length })}
                        </p>
                    </div>
                </div>
            </div>

            <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('audit.filters.search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as any)}>
                        <SelectTrigger className="w-full md:w-56">
                            <SelectValue placeholder={t('audit.filters.action')} />
                        </SelectTrigger>
                        <SelectContent>
                            {ACTION_FILTER_VALUES.map(v => (
                                <SelectItem key={v} value={v}>
                                    {v === 'all' ? t('audit.filters.allActions') : t(`audit.actions.${v}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {targetUidParam && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete('target');
                                setSearchParams(next, { replace: true });
                            }}
                        >
                            {t('audit.filters.clear')}
                        </Button>
                    )}
                </div>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">{t('audit.loading')}</p>
                </div>
            ) : visible.length === 0 ? (
                <Card className="p-12 text-center">
                    <ScrollText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground">{t('audit.empty.title')}</h2>
                    <p className="text-muted-foreground mt-2">{t('audit.empty.description')}</p>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('audit.table.when')}</TableHead>
                                <TableHead>{t('audit.table.action')}</TableHead>
                                <TableHead>{t('audit.table.actor')}</TableHead>
                                <TableHead>{t('audit.table.target')}</TableHead>
                                <TableHead>{t('audit.table.details')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map(entry => (
                                <AuditLogRow key={entry.id} entry={entry} dateLocale={dateLocale} />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}

interface RowProps {
    entry: AuditLogEntry;
    dateLocale: typeof esLocale | typeof enLocale;
}

function AuditLogRow({ entry, dateLocale }: RowProps) {
    const { t } = useTranslation('admin');
    const visual = ACTION_VISUAL[entry.action];
    const Icon = visual?.icon ?? ScrollText;

    return (
        <TableRow className="hover:bg-muted/40">
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                <span title={entry.createdAt.toISOString()}>
                    {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: dateLocale })}
                </span>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={visual?.tone ?? ''}>
                    <Icon className="h-3 w-3 mr-1" />
                    {t(`audit.actions.${entry.action}`)}
                </Badge>
            </TableCell>
            <TableCell className="text-sm">
                {entry.actorEmail ?? entry.actorUid}
            </TableCell>
            <TableCell className="text-sm">
                {entry.targetEmail ?? entry.targetUid ?? '—'}
            </TableCell>
            <TableCell className="text-xs">
                <DetailsSummary entry={entry} />
            </TableCell>
        </TableRow>
    );
}

function DetailsSummary({ entry }: { entry: AuditLogEntry }) {
    const d = entry.details;
    const items: string[] = [];

    if (entry.action === 'user.change_plan') {
        if (d.fromPlan && d.toPlan) items.push(`${d.fromPlan} → ${d.toPlan}`);
        if (d.billing) items.push(String(d.billing));
        if (d.cancelAtPeriodEnd) items.push('cancel-at-period-end');
    } else if (entry.action === 'user.grant_credits') {
        if (d.standardPages) items.push(`+${d.standardPages} standard`);
        if (d.premiumPages) items.push(`+${d.premiumPages} premium`);
        if (d.reason) items.push(`"${String(d.reason).substring(0, 60)}"`);
    } else if (entry.action === 'user.extend_trial') {
        if (d.days) items.push(`+${d.days} days`);
        if (d.reason) items.push(`"${String(d.reason).substring(0, 60)}"`);
    } else if (entry.action === 'user.bulk_disable' || entry.action === 'user.bulk_enable') {
        if (d.requested) items.push(`${d.ok}/${d.requested} ok`);
        if (d.failed) items.push(`${d.failed} failed`);
    } else if (Object.keys(d).length > 0) {
        items.push(JSON.stringify(d).substring(0, 100));
    }

    if (items.length === 0) return <span className="text-muted-foreground">—</span>;
    return <span className="text-muted-foreground font-mono">{items.join(' · ')}</span>;
}
