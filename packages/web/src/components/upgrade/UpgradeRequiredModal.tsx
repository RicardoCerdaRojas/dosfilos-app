import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlans, getPlanPriceId } from '@/hooks/usePlans';
import { PlanCard } from '@/components/subscription/PlanCard';

interface UpgradeRequiredModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reason: 'limit_reached' | 'module_restricted';
    module?: string;
    limitType?: 'sermons' | 'plans' | 'greek_sessions';
    currentLimit?: number;
}

/**
 * Plan picker shown when a Free user hits a feature gate or a limit.
 *
 * Plans + features are sourced from Firestore via `usePlans()` (same path
 * landing/pricing use), so any price/feature update propagates without a
 * code change. PlanCard is the shared brand component — keeps the modal
 * visually consistent with the public pricing surfaces.
 */
export function UpgradeRequiredModal({
    open,
    onOpenChange,
    reason,
    module,
    limitType,
    currentLimit,
}: UpgradeRequiredModalProps) {
    const navigate = useNavigate();
    const { subscription } = useSubscription();
    const { plans, isLoading } = usePlans();

    const paidPlans = (plans ?? [])
        .filter((p) => p.isPublic && (p.pricing?.monthly ?? 0) > 0)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const getTitle = () => {
        if (reason === 'limit_reached') {
            switch (limitType) {
                case 'sermons':
                    return 'Has alcanzado el límite de sermones';
                case 'plans':
                    return 'Has alcanzado el límite de planes';
                case 'greek_sessions':
                    return 'Has alcanzado el límite de estudios';
                default:
                    return 'Has alcanzado el límite mensual';
            }
        }
        return `${module ?? 'Esta función'} requiere actualizar tu plan`;
    };

    const getDescription = () => {
        if (reason === 'limit_reached') {
            const limits = {
                sermons: `Llevas ${currentLimit} ${currentLimit === 1 ? 'sermón' : 'sermones'} este mes.`,
                plans:
                    subscription?.planId === 'free'
                        ? `Ya tienes ${currentLimit} plan de predicación (límite total del plan Free).`
                        : `Llevas ${currentLimit} ${currentLimit === 1 ? 'plan' : 'planes'} este mes.`,
                greek_sessions: `Llevas ${currentLimit} ${currentLimit === 1 ? 'sesión' : 'sesiones'} de estudio este mes.`,
            };
            return `${limits[limitType ?? 'sermons']} Elige el plan que se ajusta a tu trabajo.`;
        }
        return `Para acceder a ${module ?? 'esta función'}, elige el plan que se ajusta a tu trabajo.`;
    };

    const handleUpgrade = (planId: string) => {
        onOpenChange(false);
        navigate('/dashboard/subscription', { state: { suggestedPlan: planId } });
    };

    const isFreeUser = subscription?.planId === 'free' || !subscription?.planId;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center font-reading text-[22px] md:text-[26px] leading-tight tracking-[-0.01em]">
                        {getTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-center text-[14px] md:text-[15px] text-muted-foreground max-w-md mx-auto">
                        {getDescription()}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : paidPlans.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No hay planes disponibles en este momento.
                    </p>
                ) : (
                    <div
                        className={
                            paidPlans.length >= 3
                                ? 'grid grid-cols-1 md:grid-cols-3 gap-4 mt-2'
                                : 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-2'
                        }
                    >
                        {paidPlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={{
                                    id: plan.id,
                                    name: plan.name,
                                    description: plan.description,
                                    priceMonthly: plan.pricing.monthly,
                                    stripePriceId: getPlanPriceId(plan),
                                    features: plan.features,
                                    sortOrder: plan.sortOrder,
                                    isPublic: plan.isPublic,
                                }}
                                standardPagesPerMonth={plan.limits?.standardPagesPerMonth}
                                premiumPagesPerMonth={plan.limits?.premiumPagesPerMonth}
                                exegesisUsdPerMonth={plan.limits?.exegesisUsdPerMonth}
                                isPopular={plan.highlightText === 'Más Popular'}
                                ctaLabel={`Actualizar a ${plan.name}`}
                                onCtaClick={() => handleUpgrade(plan.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="text-center pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-sm text-muted-foreground"
                    >
                        {isFreeUser ? 'Continuar con plan Free' : 'Cerrar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
