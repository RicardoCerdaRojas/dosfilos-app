import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useGeoAnalytics, type FunnelDeltas } from '@/hooks/admin/useGeoAnalytics';
import { ConversionFunnel } from '@/components/admin/ConversionFunnel';
import { WorldMap } from '@/components/admin/WorldMap';
import { CountryTable } from '@/components/admin/CountryTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Calendar, Users, UserPlus, LogIn, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type DateRange = '7d' | '30d' | '90d';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
];

export function GeographicDashboard() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const navigate = useNavigate();

    const {
        funnel,
        deltas,
        countrySummary,
        loading,
        error,
        dateRange,
        setDateRange,
    } = useGeoAnalytics();

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-8 py-10 max-w-[1500px] mx-auto">
                <Card className="p-8 text-center">
                    <p className="text-destructive">Error al cargar analytics: {error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Reintentar
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="px-8 py-10 max-w-[1500px] mx-auto space-y-8">
            {/* Header — same shape as UserManagement so admin nav reads as one product */}
            <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/admin/analytics')} className="mt-1 shrink-0">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Analytics
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            Analítica Geográfica
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Seguimiento de visitas, registros y conversión por país
                        </p>
                    </div>
                </div>

                {/* Date range as outline pill group — was a solid primary button which read as a
                    CTA rather than a filter selector. */}
                <div className="flex items-center gap-2 shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="inline-flex rounded-md border bg-card p-0.5">
                        {DATE_RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setDateRange(opt.value)}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                                    dateRange === opt.value
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {funnel && <MetricsStrip funnel={funnel} deltas={deltas} />}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            {funnel && <ConversionFunnel metrics={funnel} />}
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            <WorldMap countries={countrySummary} />
                            <CountryTable countries={countrySummary} limit={15} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

interface FunnelLike {
    landingVisits: number;
    registrations: number;
    logins: number;
    visitToRegistration: number;
    registrationToLogin: number;
    overallConversion: number;
}

/**
 * Unified KPI strip mirroring UserStatsHeader so admin pages share one pattern.
 * Hint slot carries period-over-period delta (% vs prior equal-length period)
 * for each metric — replaces the earlier mix of "6.5% de visitas" / "500% de
 * registros" / "Visita → Login" that confused signal sources.
 */
function MetricsStrip({ funnel, deltas }: { funnel: FunnelLike; deltas: FunnelDeltas | null }) {
    return (
        <div className="bg-card border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <KpiCell
                    icon={Users}
                    label="Total Visitas"
                    value={funnel.landingVisits.toLocaleString()}
                    tone="text-foreground"
                    delta={deltas?.landingVisits ?? null}
                />
                <KpiCell
                    icon={UserPlus}
                    label="Registros"
                    value={funnel.registrations.toLocaleString()}
                    tone="text-success"
                    delta={deltas?.registrations ?? null}
                    secondary={`${funnel.visitToRegistration.toFixed(1)}% de visitas`}
                />
                <KpiCell
                    icon={LogIn}
                    label="Logins"
                    value={funnel.logins.toLocaleString()}
                    tone="text-primary"
                    delta={deltas?.logins ?? null}
                    secondary={`${funnel.registrationToLogin.toFixed(1)}% de registros`}
                />
                <KpiCell
                    icon={TrendingUp}
                    label="Conversión General"
                    value={`${funnel.overallConversion.toFixed(1)}%`}
                    tone="text-info"
                    delta={deltas?.overallConversion ?? null}
                    secondary="Visita → Login"
                />
            </div>
        </div>
    );
}

interface KpiCellProps {
    icon: typeof Users;
    label: string;
    value: string;
    tone: string;
    /** % change vs prior period; null when prior had 0 (no baseline). */
    delta?: number | null;
    /** Optional secondary line under value (e.g. funnel ratio). */
    secondary?: string;
}

function KpiCell({ icon: Icon, label, value, tone, delta, secondary }: KpiCellProps) {
    const showDelta = typeof delta === 'number' && isFinite(delta);
    const deltaTone = !showDelta ? '' : delta! >= 0 ? 'text-success' : 'text-destructive';
    const deltaSign = !showDelta ? '' : delta! >= 0 ? '+' : '';

    return (
        <div className="px-6 py-5 space-y-2">
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${tone}`} />
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums leading-none ${tone}`}>{value}</p>
            <div className="space-y-0.5">
                {showDelta && (
                    <p className={`text-xs tabular-nums font-medium ${deltaTone}`}>
                        {deltaSign}{delta!.toFixed(1)}% vs período anterior
                    </p>
                )}
                {secondary && (
                    <p className="text-xs text-muted-foreground truncate" title={secondary}>{secondary}</p>
                )}
            </div>
        </div>
    );
}
