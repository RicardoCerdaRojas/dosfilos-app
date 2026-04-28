import { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { authService } from '@dosfilos/application';
import {
    CREDIT_PACK_CATALOG,
    packsByMode,
    type CreditPackDefinition,
    type ProcessingMode,
} from '@dosfilos/domain';

interface CreditPacksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditPacksDialog({ open, onOpenChange }: CreditPacksDialogProps) {
    const { t } = useTranslation('library');
    const [redirecting, setRedirecting] = useState<string | null>(null);

    const handleBuy = async (pack: CreditPackDefinition) => {
        setRedirecting(pack.id);
        try {
            const { url } = await authService.createCheckoutSession({ packId: pack.id });
            if (url) {
                window.location.href = url;
            } else {
                toast.error(t('balance.checkoutError'));
                setRedirecting(null);
            }
        } catch (err: any) {
            console.error('[CreditPacksDialog]', err);
            toast.error(err?.message ?? t('balance.checkoutError'));
            setRedirecting(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('creditPacks.title')}</DialogTitle>
                    <DialogDescription>{t('creditPacks.subtitle')}</DialogDescription>
                </DialogHeader>

                <PackSection
                    mode="standard"
                    headerKey="creditPacks.standardHeader"
                    helpKey="creditPacks.standardHelp"
                    redirecting={redirecting}
                    onBuy={handleBuy}
                />
                <PackSection
                    mode="premium"
                    headerKey="creditPacks.premiumHeader"
                    helpKey="creditPacks.premiumHelp"
                    redirecting={redirecting}
                    onBuy={handleBuy}
                />

                <p className="text-[11px] text-muted-foreground italic">
                    Total catalog: {CREDIT_PACK_CATALOG.length} packs.
                </p>
            </DialogContent>
        </Dialog>
    );
}

interface PackSectionProps {
    mode: ProcessingMode;
    headerKey: string;
    helpKey: string;
    redirecting: string | null;
    onBuy: (pack: CreditPackDefinition) => void;
}

function PackSection({ mode, headerKey, helpKey, redirecting, onBuy }: PackSectionProps) {
    const { t } = useTranslation('library');
    const Icon = mode === 'standard' ? Wand2 : Sparkles;
    const tone = mode === 'standard' ? 'text-info' : 'text-success';

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${tone}`} />
                <h3 className="font-semibold text-sm">{t(headerKey)}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t(helpKey)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {packsByMode(mode).map(pack => (
                    <PackCard
                        key={pack.id}
                        pack={pack}
                        loading={redirecting === pack.id}
                        disabled={!!redirecting && redirecting !== pack.id}
                        onBuy={() => onBuy(pack)}
                    />
                ))}
            </div>
        </div>
    );
}

interface PackCardProps {
    pack: CreditPackDefinition;
    loading: boolean;
    disabled: boolean;
    onBuy: () => void;
}

function PackCard({ pack, loading, disabled, onBuy }: PackCardProps) {
    const { t } = useTranslation('library');
    const ratePerPage = (pack.priceUsd / pack.pages).toFixed(3);

    return (
        <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {pack.size}
                </span>
                <span className="text-[20px] font-bold tabular-nums">${pack.priceUsd}</span>
            </div>
            <div>
                <p className="text-sm font-semibold">
                    {t('creditPacks.pages', { count: pack.pages })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                    {t('creditPacks.perPage', { rate: ratePerPage })}
                </p>
            </div>
            <Button
                onClick={onBuy}
                disabled={loading || disabled}
                className="w-full mt-1"
                size="sm"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('creditPacks.buy')}
            </Button>
        </Card>
    );
}
