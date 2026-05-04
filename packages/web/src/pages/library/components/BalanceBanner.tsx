import { useEffect, useState } from 'react';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { processingBalanceService, type ProcessingMode } from '@dosfilos/application';
import type { ProcessingBalance } from '@dosfilos/domain';
import { CreditPacksDialog } from './CreditPacksDialog';

/**
 * Compact balance summary shown at the top of the Library page.
 * Two stat tiles (standard / premium) plus a CTA to open the credit-packs
 * dialog. Subscribes to the live `users/{uid}.processingBalance` field
 * so the count updates the moment the cloud function debits — without
 * the user needing to refresh after an extraction completes.
 */
export function BalanceBanner() {
    const { user } = useFirebase();
    const { t } = useTranslation('library');
    const [balance, setBalance] = useState<ProcessingBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [packsOpen, setPacksOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        const unsubscribe = processingBalanceService.subscribeToBalance(
            user.uid,
            (b) => {
                setBalance(b);
                setLoading(false);
            },
            () => setLoading(false),
        );
        return () => unsubscribe();
    }, [user]);

    if (!user) return null;

    return (
        <>
            <div className="rounded-lg border border-border/60 bg-card p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
                        {t('balance.title')}
                    </span>
                    <p className="text-[13px] text-muted-foreground">{t('balance.subtitle')}</p>
                </div>

                <div className="flex flex-wrap items-stretch gap-3">
                    <BalanceTile
                        mode="standard"
                        pages={balance?.standardPagesAvailable ?? 0}
                        planPages={balance?.planStandardPages ?? 0}
                        packPages={balance?.packStandardPages ?? 0}
                        loading={loading}
                    />
                    <BalanceTile
                        mode="premium"
                        pages={balance?.premiumPagesAvailable ?? 0}
                        planPages={balance?.planPremiumPages ?? 0}
                        packPages={balance?.packPremiumPages ?? 0}
                        loading={loading}
                    />
                    <Button onClick={() => setPacksOpen(true)} className="self-center">
                        {t('balance.buyButton')}
                    </Button>
                </div>
            </div>
            <CreditPacksDialog open={packsOpen} onOpenChange={setPacksOpen} />
        </>
    );
}

interface BalanceTileProps {
    mode: ProcessingMode;
    pages: number;
    planPages: number;
    packPages: number;
    loading: boolean;
}

function BalanceTile({ mode, pages, planPages, packPages, loading }: BalanceTileProps) {
    const { t } = useTranslation('library');
    const Icon = mode === 'standard' ? Wand2 : Sparkles;
    const tone = mode === 'standard' ? 'text-info' : 'text-success';

    return (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 min-w-[160px]">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${tone}`}>
                <Icon className="h-3 w-3" />
                <span>{t(`balance.${mode}`)}</span>
            </div>
            <div className="text-[20px] font-bold leading-tight tabular-nums text-foreground mt-0.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : pages.toLocaleString()}
            </div>
            {!loading && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight tabular-nums">
                    {t('balance.split', {
                        plan: planPages.toLocaleString(),
                        pack: packPages.toLocaleString(),
                    })}
                </p>
            )}
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                {t(`balance.${mode}Help`)}
            </p>
        </div>
    );
}
