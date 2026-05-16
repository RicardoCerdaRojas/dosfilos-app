import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { usePlans } from '@/hooks/usePlans';
import { useResetUserPlanQuota } from '@/hooks/admin/useResetUserPlanQuota';
import { getPlanLabel } from '@/utils/planLabels';
import type { User } from '@dosfilos/domain';

interface ResetQuotasDialogProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * Admin-only dialog for resetting a user's monthly plan quotas back to the
 * standard allowance of their current plan. Pack credits (prepaid purchases)
 * are NOT touched — they survive renewals by design and survive this op too.
 * Separate from "Change plan" because it covers cases plan-change doesn't:
 * webhook misses, comp-account provisioning, bug compensation, support cases.
 */
export function ResetQuotasDialog({ user, isOpen, onClose, onSuccess }: ResetQuotasDialogProps) {
    const { t } = useTranslation('admin');
    const { plans, loading: plansLoading } = usePlans();
    const { resetQuota, isLoading: isResetting } = useResetUserPlanQuota();

    const [reason, setReason] = useState('');

    useEffect(() => {
        // Reset reason on open so the admin doesn't accidentally reuse the
        // prior justification on a different user.
        if (isOpen) setReason('');
    }, [isOpen, user?.id]);

    const currentPlanId = user?.subscription?.planId ?? 'free';
    const currentPlan = useMemo(
        () => plans.find((p) => p.id === currentPlanId),
        [plans, currentPlanId],
    );

    const previewQuotas = useMemo(() => {
        const limits = currentPlan?.limits ?? {};
        return {
            standard: Math.max(0, limits.standardPagesPerMonth ?? 0),
            premium: Math.max(0, limits.premiumPagesPerMonth ?? 0),
            exegesisUsd: Math.max(0, limits.exegesisUsdPerMonth ?? 0),
        };
    }, [currentPlan]);

    if (!user) return null;

    const handleConfirm = async () => {
        const trimmed = reason.trim();
        if (!trimmed) return;
        const result = await resetQuota({ userId: user.id, reason: trimmed });
        if (result) {
            onSuccess?.();
            onClose();
        }
    };

    const disabled = !reason.trim() || isResetting || plansLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5" />
                        {t('users.resetQuotaDialog.title', { name: user.displayName || user.email })}
                    </DialogTitle>
                    <DialogDescription>
                        {t('users.resetQuotaDialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Current plan summary */}
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                        <span>{t('users.resetQuotaDialog.currentPlan')}:</span>
                        <span className="font-semibold text-foreground">{getPlanLabel(currentPlanId)}</span>
                    </div>

                    {/* Preview of values about to be applied — admin sees exactly what
                        will land in plan buckets before confirming. */}
                    <Card className="p-4 bg-muted/30">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            {t('users.resetQuotaDialog.willApply')}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <QuotaPreview
                                label={t('users.resetQuotaDialog.standardPages')}
                                value={previewQuotas.standard}
                                unit={t('users.resetQuotaDialog.pagesUnit')}
                            />
                            <QuotaPreview
                                label={t('users.resetQuotaDialog.premiumPages')}
                                value={previewQuotas.premium}
                                unit={t('users.resetQuotaDialog.pagesUnit')}
                            />
                            <QuotaPreview
                                label={t('users.resetQuotaDialog.exegesisUsd')}
                                value={previewQuotas.exegesisUsd}
                                unit="USD"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3 italic">
                            {t('users.resetQuotaDialog.packNote')}
                        </p>
                    </Card>

                    {/* Free-plan callout: resetting on a Free user is allowed but
                        effectively a no-op since all 3 quotas are 0. Surface it so
                        admin doesn't think the action did nothing. */}
                    {currentPlanId === 'free' && (
                        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-subtle p-3">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <p className="text-xs text-warning-subtle-foreground">
                                {t('users.resetQuotaDialog.freePlanWarning')}
                            </p>
                        </div>
                    )}

                    {/* Reason — required for audit log */}
                    <div className="space-y-1.5">
                        <Label htmlFor="reset-reason">
                            {t('users.resetQuotaDialog.reasonLabel')} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reset-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('users.resetQuotaDialog.reasonPlaceholder')}
                            rows={3}
                            disabled={isResetting}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {t('users.resetQuotaDialog.reasonHint')}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose} disabled={isResetting}>
                        {t('users.resetQuotaDialog.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={disabled}>
                        {isResetting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('users.resetQuotaDialog.loading')}
                            </>
                        ) : (
                            t('users.resetQuotaDialog.confirm')
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function QuotaPreview({ label, value, unit }: { label: string; value: number; unit: string }) {
    return (
        <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{unit}</p>
        </div>
    );
}
