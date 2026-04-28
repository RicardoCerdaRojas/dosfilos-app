import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2, Power, PowerOff } from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { coreLibraryAdminService } from '@dosfilos/application';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

interface AccountRow {
    id: string;
    name?: string;
    apiKeySecretEnv?: string;
    creditsUsed?: number;
    creditsLimit?: number;
    resetDate?: any;
    priority?: number;
    active?: boolean;
    lastUsedAt?: any;
}

/**
 * Admin-only page at `/dashboard/admin/llamaparse-monitoring` (Hito 6).
 * Surfaces LlamaParse account consumption so the admin can see when to
 * activate / deactivate accounts before the rotation hits a wall.
 */
export default function LlamaParseMonitoring() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const [accounts, setAccounts] = useState<AccountRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    const isAdmin = user?.email === ADMIN_EMAIL;

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await coreLibraryAdminService.getLlamaParseAccounts() as AccountRow[];
            setAccounts(data.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100)));
        } catch (err: any) {
            console.error('[LlamaParseMonitoring]', err);
            toast.error(t('llamaParse.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) refresh();
    }, [isAdmin]);

    const handleToggleActive = async (account: AccountRow) => {
        const next = !(account.active !== false);
        setToggling(account.id);
        try {
            await coreLibraryAdminService.setLlamaParseAccountActive(account.id, next);
            toast.success(next ? t('llamaParse.activated') : t('llamaParse.deactivated'));
            await refresh();
        } catch (err: any) {
            console.error('[LlamaParseMonitoring] toggle', err);
            toast.error(err?.message ?? t('llamaParse.toggleError'));
        } finally {
            setToggling(null);
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted">
                <Card className="p-8 text-center max-w-md">
                    <h1 className="text-xl font-bold text-foreground">{t('common.accessDenied.title')}</h1>
                    <p className="text-muted-foreground mt-2">{t('common.accessDenied.description')}</p>
                </Card>
            </div>
        );
    }

    const totalCredits = accounts.reduce((sum, a) => sum + (a.creditsLimit ?? 0), 0);
    const totalUsed = accounts.reduce((sum, a) => sum + (a.creditsUsed ?? 0), 0);
    const totalRemaining = Math.max(0, totalCredits - totalUsed);

    return (
        <div className="min-h-screen bg-muted p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => navigate('/dashboard/admin/analytics')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Analytics
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{t('llamaParse.title')}</h1>
                            <p className="text-muted-foreground">{t('llamaParse.subtitle')}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={refresh} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('llamaParse.refresh')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SummaryTile label={t('llamaParse.summary.accounts')} value={String(accounts.length)} />
                    <SummaryTile label={t('llamaParse.summary.totalRemaining')} value={totalRemaining.toLocaleString()} />
                    <SummaryTile
                        label={t('llamaParse.summary.totalUsed')}
                        value={`${totalUsed.toLocaleString()} / ${totalCredits.toLocaleString()}`}
                    />
                </div>

                <Card>
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-muted-foreground">{t('llamaParse.empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('llamaParse.table.name')}</TableHead>
                                    <TableHead>{t('llamaParse.table.priority')}</TableHead>
                                    <TableHead>{t('llamaParse.table.usage')}</TableHead>
                                    <TableHead>{t('llamaParse.table.resetDate')}</TableHead>
                                    <TableHead>{t('llamaParse.table.status')}</TableHead>
                                    <TableHead className="text-right">{t('llamaParse.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map(account => (
                                    <AccountRowCells
                                        key={account.id}
                                        account={account}
                                        toggling={toggling === account.id}
                                        onToggle={() => handleToggleActive(account)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </div>
    );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
    return (
        <Card className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
        </Card>
    );
}

interface AccountRowCellsProps {
    account: AccountRow;
    toggling: boolean;
    onToggle: () => void;
}

function AccountRowCells({ account, toggling, onToggle }: AccountRowCellsProps) {
    const { t, i18n } = useTranslation('admin');
    const limit = account.creditsLimit ?? 0;
    const used = account.creditsUsed ?? 0;
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const isActive = account.active !== false;
    const isCritical = pct >= 90;
    const isWarning = !isCritical && pct >= 70;
    const tone = isCritical ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary';

    const resetIso = account.resetDate?.toDate?.()
        ? account.resetDate.toDate().toLocaleDateString(i18n.language)
        : '—';

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium text-foreground">{account.name ?? account.id}</div>
                <div className="text-xs text-muted-foreground font-mono">{account.apiKeySecretEnv ?? account.id}</div>
            </TableCell>
            <TableCell className="tabular-nums">{account.priority ?? 100}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2 text-xs tabular-nums">
                    <span>{used.toLocaleString()}</span>
                    <span className="text-muted-foreground">/ {limit.toLocaleString()}</span>
                    <span className="ml-auto text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{resetIso}</TableCell>
            <TableCell>
                {!isActive ? (
                    <Badge variant="outline" className="text-muted-foreground">{t('llamaParse.status.inactive')}</Badge>
                ) : isCritical ? (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t('llamaParse.status.critical')}
                    </Badge>
                ) : isWarning ? (
                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                        {t('llamaParse.status.warning')}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('llamaParse.status.healthy')}
                    </Badge>
                )}
            </TableCell>
            <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={onToggle} disabled={toggling}>
                    {toggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isActive ? (
                        <><PowerOff className="h-4 w-4 mr-1" />{t('llamaParse.actions.deactivate')}</>
                    ) : (
                        <><Power className="h-4 w-4 mr-1" />{t('llamaParse.actions.activate')}</>
                    )}
                </Button>
            </TableCell>
        </TableRow>
    );
}
