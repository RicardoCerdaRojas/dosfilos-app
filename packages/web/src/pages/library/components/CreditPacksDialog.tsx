import { useState } from 'react';
import { BookOpen, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { authService } from '@dosfilos/application';
import {
    CREDIT_PACK_CATALOG,
    STUDY_UNIT_USD,
    packsByMode,
    type CreditPackDefinition,
    type ProcessingMode,
} from '@dosfilos/domain';

interface CreditPacksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * Optional initial section to render expanded / scrolled-to. The
     * exegesis OutOfCredits dialog uses `'exegesis'` so the user lands
     * directly on the relevant packs without scrolling past the page
     * packs they don't want. When omitted, the dialog renders all
     * sections in catalog order.
     */
    focusMode?: 'exegesis';
}

export function CreditPacksDialog({ open, onOpenChange, focusMode }: CreditPacksDialogProps) {
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
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('creditPacks.title')}</DialogTitle>
                    <DialogDescription>{t('creditPacks.subtitle')}</DialogDescription>
                </DialogHeader>

                {/* When the dialog is opened with focusMode='exegesis'
                    (out-of-credits flow from the exegesis module), put
                    the exegesis section first so the user lands on
                    relevant packs without scrolling past the page-based
                    ones. Default catalog order otherwise. */}
                {focusMode === 'exegesis' && (
                    <PackSection
                        mode="exegesis"
                        headerKey="creditPacks.exegesisHeader"
                        helpKey="creditPacks.exegesisHelp"
                        redirecting={redirecting}
                        onBuy={handleBuy}
                    />
                )}
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
                {focusMode !== 'exegesis' && (
                    <PackSection
                        mode="exegesis"
                        headerKey="creditPacks.exegesisHeader"
                        helpKey="creditPacks.exegesisHelp"
                        redirecting={redirecting}
                        onBuy={handleBuy}
                    />
                )}

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

const SECTION_ICONS: Record<ProcessingMode, typeof Wand2> = {
    standard: Wand2,
    premium: Sparkles,
    exegesis: BookOpen,
};

const SECTION_TONES: Record<ProcessingMode, string> = {
    standard: 'text-info',
    premium: 'text-success',
    exegesis: 'text-primary',
};

function PackSection({ mode, headerKey, helpKey, redirecting, onBuy }: PackSectionProps) {
    const { t } = useTranslation('library');
    const Icon = SECTION_ICONS[mode];
    const tone = SECTION_TONES[mode];

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

    // Exegesis packs report `usdAmount` (USD credit) and display
    // estudios via STUDY_UNIT_USD; page-based packs report `pages`.
    // Two body variants keep the card visually consistent across
    // modes without forcing a wrapper component per shape.
    const isExegesis = pack.mode === 'exegesis';
    const studies = isExegesis && pack.usdAmount
        ? Math.round(pack.usdAmount / STUDY_UNIT_USD)
        : 0;
    const ratePerPage = !isExegesis ? (pack.priceUsd / pack.pages).toFixed(3) : null;
    const ratePerStudy = isExegesis && studies > 0
        ? (pack.priceUsd / studies).toFixed(2)
        : null;

    return (
        <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {pack.size}
                </span>
                <span className="text-[20px] font-bold tabular-nums">${pack.priceUsd}</span>
            </div>
            <div>
                {isExegesis ? (
                    <>
                        <p className="text-sm font-semibold">
                            {t('creditPacks.studies', { count: studies })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {t('creditPacks.perStudy', { rate: ratePerStudy ?? '0.00' })}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-semibold">
                            {t('creditPacks.pages', { count: pack.pages })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {t('creditPacks.perPage', { rate: ratePerPage ?? '0.000' })}
                        </p>
                    </>
                )}
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
