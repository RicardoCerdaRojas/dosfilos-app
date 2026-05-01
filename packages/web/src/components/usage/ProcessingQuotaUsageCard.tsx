import { useMemo } from 'react';
import { Wand2, Sparkles, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlans';
import { usePageBalance } from '@/hooks/usePageBalance';

/**
 * Detail card for the monthly processing quota — separates standard
 * and premium usage so the user understands exactly what they're
 * consuming. Lives on the dashboard subscription page right below
 * the generic UsageDashboard, which still surfaces aggregate counts.
 *
 * Data sources:
 *   - `plan.limits.{standardPagesPerMonth, premiumPagesPerMonth}` —
 *     the plan's monthly allotment.
 *   - `balance.{planStandardPages, planPremiumPages}` — what's left in
 *     the plan bucket right now. Used = quota - remaining.
 *   - `balance.{packStandardPages, packPremiumPages}` — extra
 *     prepaid pages from credit packs.
 *
 * Hidden when the user is on Free (no quota) or when data hasn't
 * arrived yet — UsageDashboard above already covers the "loading"
 * empty state.
 */
export function ProcessingQuotaUsageCard({ planId }: { planId: string | null | undefined }) {
    const { plan } = usePlan(planId ?? undefined);
    const { data: balance } = usePageBalance();

    const stats = useMemo(() => {
        if (!plan || !balance) return null;
        const stdQuota = Number(plan.limits?.standardPagesPerMonth ?? 0);
        const premQuota = Number(plan.limits?.premiumPagesPerMonth ?? 0);
        if (stdQuota === 0 && premQuota === 0) return null;
        return {
            standard: usageBreakdown(stdQuota, balance.planStandardPages, balance.packStandardPages),
            premium: usageBreakdown(premQuota, balance.planPremiumPages, balance.packPremiumPages),
        };
    }, [plan, balance]);

    if (!stats) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Consumo del plan este mes</CardTitle>
                <CardDescription>
                    Detalle separado por tipo de procesamiento. La cuota se renueva al inicio de cada ciclo de facturación.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <UsageRow
                    label="Páginas estándar"
                    icon={Wand2}
                    helpText="Gemini 2.0 Flash · libros narrativos, ensayos, sermones"
                    stats={stats.standard}
                />
                <UsageRow
                    label="Páginas premium"
                    icon={Sparkles}
                    helpText="LlamaParse · tablas, multi-columna, escaneados"
                    stats={stats.premium}
                />
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/dashboard/library">
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        Comprar paquetes adicionales
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

interface UsageStats {
    quota: number;
    used: number;
    planRemaining: number;
    pack: number;
    pct: number;
}

function usageBreakdown(quota: number, planRemaining: number, pack: number): UsageStats {
    const used = Math.max(0, quota - planRemaining);
    const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    return { quota, used, planRemaining, pack, pct };
}

function UsageRow({
    label,
    icon: Icon,
    helpText,
    stats,
}: {
    label: string;
    icon: typeof Wand2;
    helpText: string;
    stats: UsageStats;
}) {
    const tone = stats.pct >= 100
        ? 'bg-destructive'
        : stats.pct >= 80
            ? 'bg-warning'
            : 'bg-primary';
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>{label}</span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                    {stats.used.toLocaleString()} / {stats.quota.toLocaleString()} usadas
                </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full ${tone} transition-all duration-500`}
                    style={{ width: `${stats.pct}%` }}
                />
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{helpText}</span>
                <span className="tabular-nums">
                    Plan: {stats.planRemaining.toLocaleString()} · Packs: {stats.pack.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
