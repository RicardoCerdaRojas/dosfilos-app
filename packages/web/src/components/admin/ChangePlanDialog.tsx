import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight, CreditCard } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { usePlans } from '@/hooks/usePlans';
import { useChangePlanForUser } from '@/hooks/admin/useChangePlanForUser';
import { cn } from '@/lib/utils';
import type { User } from '@dosfilos/domain';

interface ChangePlanDialogProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Billing = 'monthly' | 'yearly';

/**
 * Admin-only dialog for changing the plan of an arbitrary user. Loads the
 * full plan catalog, lets the admin pick a destination plan + billing cycle,
 * then calls the `changePlanForUser` Cloud Function which proxies the change
 * through Stripe with proration.
 */
export function ChangePlanDialog({ user, isOpen, onClose, onSuccess }: ChangePlanDialogProps) {
    const { t } = useTranslation('admin');
    const { plans, loading: plansLoading } = usePlans();
    const { changePlan, isLoading: isChanging } = useChangePlanForUser();

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [billing, setBilling] = useState<Billing>('monthly');

    const currentPlanId = user?.subscription?.planId ?? 'free';

    useEffect(() => {
        // Reset selection on open / user change so the dialog never opens
        // with a stale prior choice.
        if (isOpen) {
            setSelectedPlanId(null);
            setBilling('monthly');
        }
    }, [isOpen, user?.id]);

    const sortedPlans = useMemo(() => {
        return [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }, [plans]);

    if (!user) return null;

    const handleConfirm = async () => {
        if (!selectedPlanId || selectedPlanId === currentPlanId) return;
        const ok = await changePlan({
            userId: user.id,
            newPlanId: selectedPlanId,
            billing,
        });
        if (ok) {
            onSuccess?.();
            onClose();
        }
    };

    const noChange = !selectedPlanId || selectedPlanId === currentPlanId;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        {t('users.changePlanDialog.title', { name: user.displayName || user.email })}
                    </DialogTitle>
                    <DialogDescription>{t('users.changePlanDialog.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-4">
                    {/* Current plan */}
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                        <span>{t('users.changePlanDialog.currentPlan')}:</span>
                        <span className="font-semibold text-foreground capitalize">{currentPlanId}</span>
                    </div>

                    {/* Plan picker */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('users.changePlanDialog.newPlan')}
                        </p>
                        {plansLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {sortedPlans.map(plan => {
                                    const isCurrent = plan.id === currentPlanId;
                                    const isSelected = plan.id === selectedPlanId;
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => !isCurrent && setSelectedPlanId(plan.id)}
                                            disabled={isCurrent}
                                            className={cn(
                                                'rounded-lg border p-3 text-left transition-all',
                                                isCurrent && 'opacity-40 cursor-not-allowed border-dashed',
                                                !isCurrent && !isSelected && 'border-border hover:border-primary/40 cursor-pointer',
                                                isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                                            )}
                                        >
                                            <div className="text-sm font-semibold capitalize">{plan.name ?? plan.id}</div>
                                            {plan.id !== 'free' && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    ${plan.pricing?.monthly ?? '—'}/mo
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Billing cycle (only meaningful for paid plans) */}
                    {selectedPlanId && selectedPlanId !== 'free' && (
                        <Card className="p-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                {t('users.changePlanDialog.billingCycle')}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant={billing === 'monthly' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setBilling('monthly')}
                                    type="button"
                                >
                                    {t('users.changePlanDialog.monthly')}
                                </Button>
                                <Button
                                    variant={billing === 'yearly' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setBilling('yearly')}
                                    type="button"
                                >
                                    {t('users.changePlanDialog.yearly')}
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                {t('users.changePlanDialog.proration')}
                            </p>
                        </Card>
                    )}

                    {/* Summary */}
                    {selectedPlanId && !noChange && (
                        <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg p-3">
                            <span className="capitalize font-medium">{currentPlanId}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize font-semibold text-primary">{selectedPlanId}</span>
                            {selectedPlanId !== 'free' && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {billing === 'monthly'
                                        ? t('users.changePlanDialog.monthly')
                                        : t('users.changePlanDialog.yearly')}
                                </span>
                            )}
                        </div>
                    )}

                    {noChange && (
                        <p className="text-sm text-muted-foreground italic">{t('users.changePlanDialog.noChange')}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose} disabled={isChanging}>
                        {t('users.changePlanDialog.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={noChange || isChanging}>
                        {isChanging ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('users.changePlanDialog.loading')}</>
                        ) : (
                            t('users.changePlanDialog.confirm')
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
