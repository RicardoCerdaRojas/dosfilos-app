import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useGeoAnalytics } from '@/hooks/admin/useGeoAnalytics';
import { ConversionFunnel } from '@/components/admin/ConversionFunnel';
import { WorldMap } from '@/components/admin/WorldMap';
import { CountryTable } from '@/components/admin/CountryTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Geographic Analytics Dashboard
 * 
 * Displays conversion funnel, world map, and country breakdown
 * for analyzing traffic sources and user acquisition
 */
export function GeographicDashboard() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const navigate = useNavigate();
    
    const {
        funnel,
        countrySummary,
        dailyMetrics,
        loading,
        error,
        dateRange,
        setDateRange,
    } = useGeoAnalytics();

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Card className="p-8 text-center">
                    <p className="text-red-600">Error al cargar analytics: {error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Reintentar
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-[95%] mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dashboard/admin/analytics')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Analytics
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Analítica Geográfica
                            </h1>
                            <p className="text-slate-600 mt-1">
                                Seguimiento de visitas, registros y conversión por país
                            </p>
                        </div>
                    </div>

                    {/* Date Range Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <div className="flex gap-2">
                            {(['7d', '30d', '90d'] as const).map((range) => (
                                <Button
                                    key={range}
                                    variant={dateRange === range ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setDateRange(range)}
                                >
                                    {range === '7d' && 'Últimos 7 días'}
                                    {range === '30d' && 'Últimos 30 días'}
                                    {range === '90d' && 'Últimos 90 días'}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Key Metrics Row */}
                        {funnel && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label="Total Visitas"
                                    value={funnel.landingVisits}
                                    icon={TrendingUp}
                                    color="blue"
                                />
                                <MetricCard
                                    label="Registros"
                                    value={funnel.registrations}
                                    icon={TrendingUp}
                                    color="green"
                                    change={`${funnel.visitToRegistration.toFixed(1)}% de visitas`}
                                />
                                <MetricCard
                                    label="Logins Activos"
                                    value={funnel.logins}
                                    icon={TrendingUp}
                                    color="purple"
                                    change={`${funnel.registrationToLogin.toFixed(1)}% de registros`}
                                />
                                <MetricCard
                                    label="Conversión General"
                                    value={`${funnel.overallConversion.toFixed(1)}%`}
                                    icon={TrendingUp}
                                    color="orange"
                                    change="Visita → Login"
                                />
                            </div>
                        )}

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Funnel */}
                            <div className="lg:col-span-1">
                                {funnel && <ConversionFunnel metrics={funnel} />}
                            </div>

                            {/* Right Column: Map & Table */}
                            <div className="lg:col-span-2 space-y-6">
                                <WorldMap countries={countrySummary} />
                                <CountryTable countries={countrySummary} limit={15} />
                            </div>
                        </div>

                        {/* Daily Trends Chart - TODO: Implement later */}
                        {/* <DailyTrendsChart data={dailyMetrics} /> */}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
    label: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    color: 'blue' | 'green' | 'purple' | 'orange';
    change?: string;
}

function MetricCard({ label, value, icon: Icon, color, change }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">{label}</p>
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change && (
                <p className="text-xs text-slate-500 mt-1">{change}</p>
            )}
        </Card>
    );
}
