import { useEffect, useState } from 'react';
import {
    FileText,
    MessageSquareQuote,
    Library,
    TrendingUp,
    PenLine,
    Calendar,
    GraduationCap,
    BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { UsageLimitsService } from '@dosfilos/application/src/services/UsageLimitsService';
import { FirebaseUserProfileRepository, FirebasePlanRepository } from '@dosfilos/infrastructure';
import { cn } from '@/lib/utils';

const usageLimitsService = new UsageLimitsService(
    new FirebaseUserProfileRepository(),
    new FirebasePlanRepository(),
);

interface QuotaSnapshot {
    current: number;
    limit?: number;
}

interface UsageSnapshot {
    docs: QuotaSnapshot;
    pagesProcessed: QuotaSnapshot;
    queries: QuotaSnapshot;
    sermons: QuotaSnapshot;
    series: QuotaSnapshot;
    greekSessions: QuotaSnapshot;
    hebrewSessions: QuotaSnapshot;
    periodKey: string;
}

function formatPeriodLabel(periodKey: string): string {
    const [year, month] = periodKey.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const m = monthNames[parseInt(month, 10) - 1] ?? month;
    return `${m} ${year}`;
}

interface QuotaRowProps {
    label: string;
    icon: React.ComponentType<any>;
    quota: QuotaSnapshot;
    unit: string;
    /** Free-text explainer when this quota isn't included on the user's plan. */
    notIncludedHint?: string;
}

/**
 * Single quota row. Limit semantics:
 *   - `undefined` → no quota field on the plan; show count without bar.
 *   - `0` → feature NOT included in this tier; render a muted "no incluido" hint.
 *   - `-1` → unlimited; show count + "ilimitado" badge.
 *   - `n>0` → progress bar with current/limit + warning thresholds.
 */
function QuotaRow({ label, icon: Icon, quota, unit, notIncludedHint }: QuotaRowProps) {
    const { current, limit } = quota;

    // Not included in this plan — render a muted disabled-state row instead
    // of "0/0" with a misleading bar.
    if (limit === 0) {
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground/70">
                        <Icon className="h-4 w-4" />
                        {label}
                    </span>
                    <span className="text-muted-foreground/70 text-xs">No incluido</span>
                </div>
                {notIncludedHint && (
                    <div className="text-[11px] text-muted-foreground/60 pl-5.5">
                        {notIncludedHint}
                    </div>
                )}
            </div>
        );
    }

    // No quota field at all (legacy plan) — show count without enforcement.
    if (limit === undefined) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {label}
                    </span>
                    <span className="font-medium tabular-nums">{current.toLocaleString()} {unit}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">Sin límite definido</div>
            </div>
        );
    }

    // Unlimited (Pro/Equipo) — show count + ∞ marker.
    if (limit < 0) {
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {label}
                    </span>
                    <span className="font-medium tabular-nums">
                        {current.toLocaleString()} <span className="text-muted-foreground/70">/ ∞</span>
                    </span>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Ilimitado en tu plan ✓</div>
            </div>
        );
    }

    // Bounded quota — render progress bar with warning thresholds.
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
                <span
                    className={cn(
                        'font-medium tabular-nums',
                        isOver && 'text-destructive',
                        isWarning && 'text-amber-600',
                    )}
                >
                    {current.toLocaleString()} <span className="text-muted-foreground">/ {limit.toLocaleString()} {unit}</span>
                </span>
            </div>
            <Progress
                value={pct}
                className={cn(
                    'h-2',
                    isOver && '[&>div]:bg-destructive',
                    isWarning && '[&>div]:bg-amber-500',
                )}
            />
            {isOver && (
                <div className="text-[11px] text-destructive">Límite alcanzado — haz upgrade para continuar</div>
            )}
            {isWarning && !isOver && (
                <div className="text-[11px] text-amber-600">Acercándose al límite</div>
            )}
            {!isOver && !isWarning && (
                <div className="text-[11px] text-muted-foreground tabular-nums">
                    {(limit - current).toLocaleString()} {unit} disponibles
                </div>
            )}
        </div>
    );
}

/**
 * Per-plan usage snapshot. Renders every quota the user's plan offers and
 * hides the ones that don't apply (limit=0). The point isn't to show usage
 * after-the-fact; it's to make the value of the plan visible at a glance —
 * "tienes X de Y disponible" reads as capacity, not consumption.
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
                        <TrendingUp className="h-4 w-4 text-primary" />
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

    // Determine if any quota is limit > 0 — drives the "ver planes" CTA visibility.
    const hasBoundedQuota = [
        usage.docs, usage.pagesProcessed, usage.queries,
        usage.sermons, usage.series, usage.greekSessions, usage.hebrewSessions,
    ].some(q => typeof q.limit === 'number' && q.limit > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Uso del mes
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                        {formatPeriodLabel(usage.periodKey)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Sermon production — relevant to every plan since Free has 3/mes */}
                <QuotaRow
                    label="Sermones creados este mes"
                    icon={PenLine}
                    quota={usage.sermons}
                    unit="sermones"
                />
                <QuotaRow
                    label="Series y planes este mes"
                    icon={Calendar}
                    quota={usage.series}
                    unit="series"
                />

                {/* Tutors — Free/Personal have caps as conversion hooks */}
                <QuotaRow
                    label="Sesiones de Tutor Griego"
                    icon={GraduationCap}
                    quota={usage.greekSessions}
                    unit="sesiones"
                />
                <QuotaRow
                    label="Sesiones de Tutor Hebreo"
                    icon={BookOpen}
                    quota={usage.hebrewSessions}
                    unit="sesiones"
                />

                {/* Faculty queries — quota that hits Free first */}
                <QuotaRow
                    label="Consultas a tutores AI"
                    icon={MessageSquareQuote}
                    quota={usage.queries}
                    unit="consultas"
                />

                {/* Personal library — only paid plans have these */}
                <QuotaRow
                    label="Documentos en biblioteca personal"
                    icon={Library}
                    quota={usage.docs}
                    unit="docs"
                    notIncludedHint="Disponible desde el plan Personal"
                />
                <QuotaRow
                    label="Páginas procesadas este mes"
                    icon={FileText}
                    quota={usage.pagesProcessed}
                    unit="págs"
                    notIncludedHint="Disponible desde el plan Personal"
                />

                {hasBoundedQuota && (
                    <div className="pt-3 border-t">
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to="/pricing">Ver planes disponibles</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
