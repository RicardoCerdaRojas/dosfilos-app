import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useAdminMetrics } from '@/hooks/admin/useAdminMetrics';
import { MetricCard } from '@/components/admin/MetricCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Users, 
    Activity, 
    DollarSign, 
    TrendingUp,
    ArrowLeft,
    Loader2,
    Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AnalyticsDashboard() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const { metrics, loading: metricsLoading, error } = useAdminMetrics();
    const navigate = useNavigate();

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
                    <p className="text-red-600">Error al cargar métricas: {error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Reintentar
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Dashboard
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                        <p className="text-slate-600 mt-1">
                            Métricas y estadísticas de la plataforma
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/dashboard/admin/geographic')}
                    >
                        <Globe className="h-4 w-4 mr-2" />
                        Analytics Geográfico
                    </Button>
                    <Button onClick={() => navigate('/dashboard/admin/users')}>
                        <Users className="h-4 w-4 mr-2" />
                        Gestión de Usuarios
                    </Button>
                </div>
            </div>

            {metricsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-slate-600">Cargando métricas...</p>
                </div>
            ) : metrics ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <MetricCard
                            title="Total de Usuarios"
                            value={metrics.totalUsers.toLocaleString()}
                            subtitle={`${metrics.newUsersToday} nuevos hoy`}
                            trend={metrics.growthRate !== 0 ? {
                                value: metrics.growthRate,
                                direction: metrics.growthRate > 0 ? 'up' : 'down'
                            } : undefined}
                            icon={<Users className="h-6 w-6" />}
                            colorScheme="blue"
                        />

                        <MetricCard
                            title="DAU"
                            value={metrics.dau.toLocaleString()}
                            subtitle="Usuarios activos hoy"
                            icon={<Activity className="h-6 w-6" />}
                            colorScheme="green"
                        />

                        <MetricCard
                            title="MAU"
                            value={metrics.mau.toLocaleString()}
                            subtitle="Usuarios activos (30 días)"
                            icon={<TrendingUp className="h-6 w-6" />}
                            colorScheme="purple"
                        />

                        <MetricCard
                            title="MRR"
                            value={`$${metrics.mrr.toLocaleString()}`}
                            subtitle="Revenue mensual recurrente"
                            icon={<DollarSign className="h-6 w-6" />}
                            colorScheme="orange"
                        />
                    </div>

                    {/* Subscription Distribution */}
                    <Card className="p-6 mb-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">
                            Distribución de Planes
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <p className="text-3xl font-bold text-slate-700 mb-1">
                                    {metrics.activeSubscriptions.free}
                                </p>
                                <p className="text-sm text-slate-600">Free</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {((metrics.activeSubscriptions.free / metrics.totalUsers) * 100).toFixed(1)}%
                                </p>
                            </div>

                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-3xl font-bold text-blue-700 mb-1">
                                    {metrics.activeSubscriptions.pro}
                                </p>
                                <p className="text-sm text-blue-600">Pro</p>
                                <p className="text-xs text-blue-500 mt-1">
                                    {((metrics.activeSubscriptions.pro / metrics.totalUsers) * 100).toFixed(1)}%
                                </p>
                            </div>

                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <p className="text-3xl font-bold text-purple-700 mb-1">
                                    {metrics.activeSubscriptions.team}
                                </p>
                                <p className="text-sm text-purple-600">Team</p>
                                <p className="text-xs text-purple-500 mt-1">
                                    {((metrics.activeSubscriptions.team / metrics.totalUsers) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Activity Metrics - NEW */}
                    <Card className="p-6 mb-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">
                            Métricas de Actividad
                        </h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="border-l-4 border-indigo-500 pl-4">
                                <p className="text-sm text-slate-600">Sermones Creados</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalSermonsCreated || 0}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Total de todos los tiempos
                                </p>
                            </div>

                            <div className="border-l-4 border-pink-500 pl-4">
                                <p className="text-sm text-slate-600">Sermones Hoy</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.sermonsCreatedToday || 0}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Nuevos sermones creados hoy
                                </p>
                            </div>

                            <div className="border-l-4 border-teal-500 pl-4">
                                <p className="text-sm text-slate-600">Total Logins</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalLogins || 0}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Sesiones iniciadas (total)
                                </p>
                            </div>

                            <div className="border-l-4 border-violet-500 pl-4">
                                <p className="text-sm text-slate-600">Sesiones de Estudio</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalGreekSessions || 0}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Greek Tutor
                                </p>
                            </div>

                            <div className="border-l-4 border-amber-500 pl-4">
                                <p className="text-sm text-slate-600">Promedio Sermones</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalUsers > 0 
                                        ? ((metrics.totalSermonsCreated || 0) / metrics.totalUsers).toFixed(1)
                                        : '0.0'
                                    }
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Por usuario
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">
                            Estadísticas Rápidas
                        </h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <p className="text-sm text-slate-600">Usuarios Pagos</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.activeSubscriptions.pro + metrics.activeSubscriptions.team}
                                </p>
                            </div>

                            <div className="border-l-4 border-green-500 pl-4">
                                <p className="text-sm text-slate-600">Tasa de Conversión</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.totalUsers > 0 
                                        ? ((
                                            (metrics.activeSubscriptions.pro + metrics.activeSubscriptions.team) / 
                                            metrics.totalUsers
                                        ) * 100).toFixed(1)
                                        : 0
                                    }%
                                </p>
                            </div>

                            <div className="border-l-4 border-purple-500 pl-4">
                                <p className="text-sm text-slate-600">ARPU</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    ${metrics.totalUsers > 0 ? (metrics.mrr / metrics.totalUsers).toFixed(2) : '0.00'}
                                </p>
                            </div>

                            <div className="border-l-4 border-orange-500 pl-4">
                                <p className="text-sm text-slate-600">Sticky Factor</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {metrics.mau > 0 ? ((metrics.dau / metrics.mau) * 100).toFixed(1) : '0'}%
                                </p>
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className="p-12 text-center">
                    <p className="text-slate-600">No hay métricas disponibles</p>
                </Card>
            )}
        </div>
    );
}
