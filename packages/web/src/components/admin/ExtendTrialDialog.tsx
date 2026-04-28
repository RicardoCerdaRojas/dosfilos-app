import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useExtendUserTrialAdmin } from '@/hooks/admin/useExtendUserTrialAdmin';
import { formatDateLong } from '@/utils/formatters';
import type { User } from '@dosfilos/domain';

interface ExtendTrialDialogProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

function asDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    return null;
}

/**
 * Admin-only dialog to extend (or re-open) a user's trial period.
 * Bounded between 1 and 90 days to prevent fat-fingered "9999" mistakes.
 */
export function ExtendTrialDialog({ user, isOpen, onClose, onSuccess }: ExtendTrialDialogProps) {
    const { t } = useTranslation('admin');
    const { extendTrial, isLoading } = useExtendUserTrialAdmin();

    const [days, setDays] = useState('14');
    const [reason, setReason] = useState('');

    const daysNum = parseInt(days, 10) || 0;
    const daysValid = daysNum >= 1 && daysNum <= 90;
    const valid = daysValid && reason.trim().length > 0;

    const currentTrialEnd = asDate(user?.subscription?.trialEnd);
    const projectedEnd = useMemo(() => {
        if (!daysValid) return null;
        const anchor = currentTrialEnd && currentTrialEnd > new Date() ? currentTrialEnd : new Date();
        return new Date(anchor.getTime() + daysNum * 24 * 60 * 60 * 1000);
    }, [currentTrialEnd, daysNum, daysValid]);

    if (!user) return null;

    const reset = () => {
        setDays('14');
        setReason('');
    };

    const handleConfirm = async () => {
        if (!valid) return;
        const ok = await extendTrial({
            userId: user.id,
            days: daysNum,
            reason: reason.trim(),
        });
        if (ok) {
            reset();
            onSuccess?.();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t('users.extendTrialDialog.title', { name: user.displayName || user.email })}
                    </DialogTitle>
                    <DialogDescription>{t('users.extendTrialDialog.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Current vs new */}
                    <div className="bg-muted/40 rounded-md p-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{t('users.extendTrialDialog.currentTrialEnd')}:</span>
                            <span className="font-medium text-foreground">
                                {currentTrialEnd ? formatDateLong(currentTrialEnd) : t('users.extendTrialDialog.noTrial')}
                            </span>
                        </div>
                        {projectedEnd && (
                            <div className="flex items-center gap-2 mt-1 text-success">
                                <ArrowRight className="h-3.5 w-3.5" />
                                <span>{t('users.extendTrialDialog.newTrialEnd')}:</span>
                                <span className="font-bold">{formatDateLong(projectedEnd)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="extend-days">{t('users.extendTrialDialog.days')}</Label>
                        <Input
                            id="extend-days"
                            type="number"
                            min={1}
                            max={90}
                            inputMode="numeric"
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                        />
                        {!daysValid && days.length > 0 && (
                            <p className="text-xs italic text-destructive">{t('users.extendTrialDialog.daysOutOfRange')}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="extend-reason">{t('users.extendTrialDialog.reason')}</Label>
                        <Textarea
                            id="extend-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('users.extendTrialDialog.reasonPlaceholder')}
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isLoading}>
                        {t('users.extendTrialDialog.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={!valid || isLoading}>
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('users.extendTrialDialog.loading')}</>
                        ) : (
                            t('users.extendTrialDialog.confirm')
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
