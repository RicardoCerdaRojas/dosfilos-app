import { FunnelMetrics } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { ArrowRight, Users, UserPlus, LogIn } from 'lucide-react';

interface Props {
    metrics: FunnelMetrics;
}

/**
 * Conversion Funnel Component
 * 
 * Displays the user journey from landing page visit to active login
 * with conversion rates between each stage
 */
export function ConversionFunnel({ metrics }: Props) {
    const stages = [
        {
            label: 'Visitas al Landing',
            value: metrics.landingVisits,
            icon: Users,
            color: 'blue',
        },
        {
            label: 'Registros',
            value: metrics.registrations,
            icon: UserPlus,
            color: 'green',
            conversionRate: metrics.visitToRegistration,
        },
        {
            label: 'Logins Activos',
            value: metrics.logins,
            icon: LogIn,
            color: 'purple',
            conversionRate: metrics.registrationToLogin,
        },
    ];

    const getColorClasses = (color: string) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200',
        };
        return colors[color as keyof typeof colors] || colors.blue;
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Embudo de Conversión</h3>

            <div className="space-y-4">
                {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    const isLast = index === stages.length - 1;

                    return (
                        <div key={stage.label}>
                            {/* Stage Card */}
                            <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getColorClasses(stage.color)}`}>
                                <div className="p-3 rounded-lg bg-white/50">
                                    <Icon className="h-6 w-6" />
                                </div>

                                <div className="flex-1">
                                    <p className="text-sm font-medium opacity-80">{stage.label}</p>
                                    <p className="text-3xl font-bold">{stage.value.toLocaleString()}</p>
                                </div>

                                {stage.conversionRate !== undefined && (
                                    <div className="text-right">
                                        <p className="text-xs opacity-60">Conversión</p>
                                        <p className="text-2xl font-bold">{stage.conversionRate.toFixed(1)}%</p>
                                    </div>
                                )}
                            </div>

                            {/* Arrow connector */}
                            {!isLast && (
                                <div className="flex items-center justify-center py-2">
                                    <ArrowRight className="h-6 w-6 text-slate-400" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Overall conversion */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Conversión General (Visita → Login)</span>
                    <span className="text-xl font-bold text-slate-900">{metrics.overallConversion.toFixed(2)}%</span>
                </div>
            </div>
        </Card>
    );
}
