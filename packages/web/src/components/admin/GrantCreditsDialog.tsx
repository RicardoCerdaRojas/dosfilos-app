import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, Sparkles, Plus } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useGrantUserCredits } from '@/hooks/admin/useGrantUserCredits';
import type { User } from '@dosfilos/domain';

interface GrantCreditsDialogProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * Admin-only dialog to grant additional processing pages to a user.
 * Pre-shows the current balance + post-grant projection so the admin sees
 * exactly the impact before confirming.
 */
export function GrantCreditsDialog({ user, isOpen, onClose, onSuccess }: GrantCreditsDialogProps) {
    const { t } = useTranslation('admin');
    const { grant, isLoading } = useGrantUserCredits();

    const [standardPages, setStandardPages] = useState('');
    const [premiumPages, setPremiumPages] = useState('');
    const [reason, setReason] = useState('');

    const standardNum = Math.max(0, parseInt(standardPages, 10) || 0);
    const premiumNum = Math.max(0, parseInt(premiumPages, 10) || 0);

    const balance = user?.processingBalance ?? {
        standardPagesAvailable: 0,
        premiumPagesAvailable: 0,
        standardSpentTotal: 0,
        premiumSpentTotal: 0,
    };

    const valid = useMemo(() => {
        return (standardNum > 0 || premiumNum > 0) && reason.trim().length > 0;
    }, [standardNum, premiumNum, reason]);

    if (!user) return null;

    const reset = () => {
        setStandardPages('');
        setPremiumPages('');
        setReason('');
    };

    const handleConfirm = async () => {
        if (!valid) return;
        const ok = await grant({
            userId: user.id,
            standardPages: standardNum || undefined,
            premiumPages: premiumNum || undefined,
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
                        <Plus className="h-5 w-5" />
                        {t('users.grantCreditsDialog.title', { name: user.displayName || user.email })}
                    </DialogTitle>
                    <DialogDescription>{t('users.grantCreditsDialog.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Current balance card */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/40 rounded-md p-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                <Wand2 className="h-3.5 w-3.5 text-info" />
                                <span className="uppercase tracking-wider font-bold">{t('users.grantCreditsDialog.standardPages')}</span>
                            </div>
                            <div className="tabular-nums">
                                <span className="text-muted-foreground">{t('users.grantCreditsDialog.currentBalance')}: </span>
                                <span className="font-bold">{balance.standardPagesAvailable.toLocaleString()}</span>
                            </div>
                            {standardNum > 0 && (
                                <div className="tabular-nums mt-0.5 text-success">
                                    {t('users.grantCreditsDialog.afterGrant')}: <span className="font-bold">{(balance.standardPagesAvailable + standardNum).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-muted/40 rounded-md p-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                <Sparkles className="h-3.5 w-3.5 text-success" />
                                <span className="uppercase tracking-wider font-bold">{t('users.grantCreditsDialog.premiumPages')}</span>
                            </div>
                            <div className="tabular-nums">
                                <span className="text-muted-foreground">{t('users.grantCreditsDialog.currentBalance')}: </span>
                                <span className="font-bold">{balance.premiumPagesAvailable.toLocaleString()}</span>
                            </div>
                            {premiumNum > 0 && (
                                <div className="tabular-nums mt-0.5 text-success">
                                    {t('users.grantCreditsDialog.afterGrant')}: <span className="font-bold">{(balance.premiumPagesAvailable + premiumNum).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="standard-pages">{t('users.grantCreditsDialog.standardPages')}</Label>
                            <Input
                                id="standard-pages"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={standardPages}
                                onChange={(e) => setStandardPages(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="premium-pages">{t('users.grantCreditsDialog.premiumPages')}</Label>
                            <Input
                                id="premium-pages"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={premiumPages}
                                onChange={(e) => setPremiumPages(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="grant-reason">{t('users.grantCreditsDialog.reason')}</Label>
                        <Textarea
                            id="grant-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('users.grantCreditsDialog.reasonPlaceholder')}
                            rows={3}
                        />
                    </div>

                    {!valid && (standardNum + premiumNum > 0 || reason.length > 0) && (
                        <p className="text-xs italic text-muted-foreground">{t('users.grantCreditsDialog.missingValues')}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isLoading}>
                        {t('users.grantCreditsDialog.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={!valid || isLoading}>
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('users.grantCreditsDialog.loading')}</>
                        ) : (
                            t('users.grantCreditsDialog.confirm')
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
