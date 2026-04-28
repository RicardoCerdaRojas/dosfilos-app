import { useEffect, useState } from 'react';
import { FileText, MessageSquareQuote, Library, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { UsageLimitsService } from '@dosfilos/application/src/services/UsageLimitsService';
import { FirebaseUserProfileRepository, FirebasePlanRepository } from '@dosfilos/infrastructure';
import { cn } from '@/lib/utils';

// Singleton — avoids re-instantiating repositories on every render
const usageLimitsService = new UsageLimitsService(
    new FirebaseUserProfileRepository(),
    new FirebasePlanRepository()
);

interface UsageSnapshot {
    docs: { current: number; limit?: number };
    pagesProcessed: { current: number; limit?: number };
    queries: { current: number; limit?: number };
    periodKey: string;
}

function formatPeriodLabel(periodKey: string): string {
    // "2026-04" → "Abril 2026"
    const [year, month] = periodKey.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const m = monthNames[parseInt(month, 10) - 1] ?? month;
    return `${m} ${year}`;
}

function QuotaBar({ label, icon: Icon, current, limit, unit }: {
    label: string;
    icon: React.ComponentType<any>;
    current: number;
    limit: number | undefined;
    unit: string;
}) {
    // Unlimited (-1) or undefined → no progress, just the count
    if (limit === undefined) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {label}
                    </span>
                    <span className="font-medium tabular-nums">{current} {unit}</span>
                </div>
                <div className="text-xs text-muted-foreground">Sin límite en tu plan actual</div>
            </div>
        );
    }
    if (limit < 0) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {label}
                    </span>
                    <span className="font-medium tabular-nums">{current} <span className="text-muted-foreground">/ ∞</span></span>
                </div>
                <div className="text-xs text-emerald-600">Ilimitado ✓</div>
            </div>
        );
    }

    const pct = Math.min(100, (current / limit) * 100);
    const isWarning = pct >= 80 && pct < 100;
    const isOver = pct >= 100;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {label}
                </span>
                <span className={cn(
                    "font-medium tabular-nums",
                    isOver && "text-destructive",
                    isWarning && "text-amber-600"
                )}>
                    {current.toLocaleString()} <span className="text-muted-foreground">/ {limit.toLocaleString()} {unit}</span>
                </span>
            </div>
            <Progress
                value={pct}
                className={cn(
                    "h-2",
                    isOver && "[&>div]:bg-destructive",
                    isWarning && "[&>div]:bg-amber-500"
                )}
            />
            {isOver && (
                <div className="text-xs text-destructive">Límite alcanzado — haz upgrade para continuar</div>
            )}
            {isWarning && (
                <div className="text-xs text-amber-600">Acercándose al límite</div>
            )}
        </div>
    );
}

/**
 * User-facing dashboard of monthly usage vs plan limits.
 * Renders at /dashboard/subscription (inside the SubscriptionPage) and optionally
 * inline wherever a quota is relevant.
 */
export function UsageDashboard() {
    const { user } = useFirebase();
    const [usage, setUsage] = useState<UsageSnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        let mounted = true;
        setLoading(true);
        usageLimitsService.getMonthlyUsage(user.uid)
            .then(u => { if (mounted) { setUsage(u); setLoading(false); } })
            .catch(err => { console.warn('[UsageDashboard] Failed:', err); if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [user?.uid]);

    if (loading || !usage) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        Uso del mes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                        Cargando...
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasAnyLimit = usage.docs.limit !== undefined
        || usage.pagesProcessed.limit !== undefined
        || usage.queries.limit !== undefined;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        Uso del mes
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                        {formatPeriodLabel(usage.periodKey)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <QuotaBar
                    label="Documentos en tu biblioteca"
                    icon={Library}
                    current={usage.docs.current}
                    limit={usage.docs.limit}
                    unit="docs"
                />
                <QuotaBar
                    label="Páginas procesadas este mes"
                    icon={FileText}
                    current={usage.pagesProcessed.current}
                    limit={usage.pagesProcessed.limit}
                    unit="págs"
                />
                <QuotaBar
                    label="Consultas este mes"
                    icon={MessageSquareQuote}
                    current={usage.queries.current}
                    limit={usage.queries.limit}
                    unit="queries"
                />
                {hasAnyLimit && (
                    <div className="pt-2 border-t">
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to="/pricing">Ver planes disponibles</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
