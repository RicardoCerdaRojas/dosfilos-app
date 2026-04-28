import { useNavigate } from 'react-router-dom';
import { useAuditLog, type AuditAction, type AuditLogEntry } from '@/hooks/admin/useAuditLog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Loader2, ScrollText, Trash2, UserX, UserCheck, Mail, CreditCard,
    Plus, Calendar as CalendarIcon, Layers, ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

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

interface Props {
    userId: string;
}

export function AuditTab({ userId }: Props) {
    const { t, i18n } = useTranslation('admin');
    const navigate = useNavigate();
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;
    const { entries, loading } = useAuditLog({ targetUid: userId });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {t('users.audit.scopedHint')} · {t('audit.showingCount', { count: entries.length })}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/admin/audit-log?target=${userId}`)}
                >
                    {t('users.audit.openFull')}
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : entries.length === 0 ? (
                <Card className="p-12 text-center">
                    <ScrollText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('users.audit.empty')}</p>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('audit.table.when')}</TableHead>
                                <TableHead>{t('audit.table.action')}</TableHead>
                                <TableHead>{t('audit.table.actor')}</TableHead>
                                <TableHead>{t('audit.table.details')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) => (
                                <Row key={entry.id} entry={entry} dateLocale={dateLocale} />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}

function Row({ entry, dateLocale }: { entry: AuditLogEntry; dateLocale: typeof esLocale | typeof enLocale }) {
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
            <TableCell className="text-sm">{entry.actorEmail ?? entry.actorUid}</TableCell>
            <TableCell className="text-xs text-muted-foreground font-mono">
                {summarize(entry)}
            </TableCell>
        </TableRow>
    );
}

function summarize(entry: AuditLogEntry): string {
    const d = entry.details;
    if (entry.action === 'user.change_plan') {
        const items: string[] = [];
        if (d.fromPlan && d.toPlan) items.push(`${d.fromPlan} → ${d.toPlan}`);
        if (d.billing) items.push(String(d.billing));
        return items.join(' · ') || '—';
    }
    if (entry.action === 'user.grant_credits') {
        const items: string[] = [];
        if (d.standardPages) items.push(`+${d.standardPages} std`);
        if (d.premiumPages) items.push(`+${d.premiumPages} prem`);
        if (d.reason) items.push(`"${String(d.reason).substring(0, 40)}"`);
        return items.join(' · ') || '—';
    }
    if (entry.action === 'user.extend_trial') {
        const items: string[] = [];
        if (d.days) items.push(`+${d.days} days`);
        if (d.reason) items.push(`"${String(d.reason).substring(0, 40)}"`);
        return items.join(' · ') || '—';
    }
    if (Object.keys(d).length > 0) {
        return JSON.stringify(d).substring(0, 80);
    }
    return '—';
}
