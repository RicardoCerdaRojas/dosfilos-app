import { FunnelMetrics } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Users, UserPlus, LogIn, Download, Sparkles, CreditCard, ChevronDown } from 'lucide-react';

interface Props {
    metrics: FunnelMetrics;
}

interface StageDef {
    label: string;
    value: number;
    icon: typeof Users;
    tone: string;
    accent: string;
    conversionRate?: number;
    placeholder?: boolean;
    placeholderNote?: string;
}

/**
 * Conversion funnel. v1 surfaces the 3 stages currently tracked by the
 * `GeoEvent` dataset (landing_visit → registration → login). Lead-magnet,
 * trial, and paid stages render as dashed placeholders below — backend
 * tracking lands in a follow-up (`funnel_events/` collection already exists
 * for Hito 7; needs `lead_magnet_download`, `trial_started`, `paid_conversion`
 * emitters wired up).
 */
export function ConversionFunnel({ metrics }: Props) {
    const stages: StageDef[] = [
        {
            label: 'Visitas al Landing',
            value: metrics.landingVisits,
            icon: Users,
            tone: 'text-info-subtle-foreground',
            accent: 'bg-info-subtle border-info/30',
        },
        {
            label: 'Lead Magnet',
            value: 0,
            icon: Download,
            tone: 'text-muted-foreground',
            accent: 'bg-muted/40 border-dashed border-border',
            placeholder: true,
            placeholderNote: 'Pendiente: emisor de evento en landing',
        },
        {
            label: 'Registros',
            value: metrics.registrations,
            icon: UserPlus,
            tone: 'text-success-subtle-foreground',
            accent: 'bg-success-subtle border-success/30',
            conversionRate: metrics.visitToRegistration,
        },
        {
            label: 'Logins Activos',
            value: metrics.logins,
            icon: LogIn,
            tone: 'text-primary',
            accent: 'bg-primary/10 border-primary/30',
            conversionRate: metrics.registrationToLogin,
        },
        {
            label: 'Trial Activado',
            value: 0,
            icon: Sparkles,
            tone: 'text-muted-foreground',
            accent: 'bg-muted/40 border-dashed border-border',
            placeholder: true,
            placeholderNote: 'Pendiente: webhook Stripe trial_started',
        },
        {
            label: 'Conversión Paga',
            value: 0,
            icon: CreditCard,
            tone: 'text-muted-foreground',
            accent: 'bg-muted/40 border-dashed border-border',
            placeholder: true,
            placeholderNote: 'Pendiente: webhook Stripe invoice.paid',
        },
    ];

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Embudo de Conversión</h3>
            <p className="text-xs text-muted-foreground mb-6">
                Recorrido del usuario desde landing hasta cliente pagador
            </p>

            <div className="space-y-2">
                {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    const isLast = index === stages.length - 1;
                    const prevTracked = stages.slice(0, index).reverse().find(s => !s.placeholder);
                    const dropOff = !stage.placeholder && prevTracked && prevTracked.value > 0
                        ? Math.max(0, prevTracked.value - stage.value)
                        : 0;

                    return (
                        <div key={stage.label}>
                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${stage.accent}`}>
                                <div className="p-2 rounded-md bg-background/50">
                                    <Icon className={`h-4 w-4 ${stage.tone}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium uppercase tracking-wider ${stage.tone}`}>
                                        {stage.label}
                                    </p>
                                    <p className={`text-2xl font-bold tabular-nums ${stage.tone}`}>
                                        {stage.placeholder ? '—' : stage.value.toLocaleString()}
                                    </p>
                                    {stage.placeholderNote && (
                                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic">
                                            {stage.placeholderNote}
                                        </p>
                                    )}
                                </div>
                                {stage.conversionRate !== undefined && (
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conv.</p>
                                        <p className={`text-lg font-bold tabular-nums ${stage.tone}`}>
                                            {stage.conversionRate.toFixed(1)}%
                                        </p>
                                    </div>
                                )}
                            </div>

                            {!isLast && (
                                <div className="flex items-center justify-center py-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <ChevronDown className="h-3 w-3" />
                                        {dropOff > 0 && <span>{dropOff.toLocaleString()} salen aquí</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Conversión general
                </span>
                <span className="text-lg font-bold text-primary tabular-nums">
                    {metrics.overallConversion.toFixed(2)}%
                </span>
            </div>
        </Card>
    );
}
