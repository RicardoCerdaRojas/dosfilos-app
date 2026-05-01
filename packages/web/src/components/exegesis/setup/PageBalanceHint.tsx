import { Zap, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { usePageBalance } from '@/hooks/usePageBalance';

/**
 * Compact pill that surfaces the user's current processing balance
 * inline on the exegesis setup page. The user discovers their saldo
 * BEFORE choosing to upload (or extract from library), instead of
 * crashing into the credit-pack modal at upload time.
 *
 * Color tone:
 *   - balance > 20% of monthly plan quota → muted (informational)
 *   - balance ≤ 20% of monthly plan quota → warning
 *   - balance == 0 → destructive
 *
 * The thresholds are absolute (200 std / 20 prem) rather than %
 * relative to the plan because we don't want to fetch the plan doc
 * here — keeping this component dependency-light for fast first paint.
 */
export function PageBalanceHint() {
    const { t } = useTranslation('exegesis');
    const { data: balance } = usePageBalance();

    if (!balance) return null;

    const std = balance.standardPagesAvailable;
    const prem = balance.premiumPagesAvailable;
    const stdTone = toneFor(std, 200);
    const premTone = toneFor(prem, 20);

    return (
        <div className="inline-flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span className={stdTone}>
                    {t('paperSetup.subSteps.corpus.balance.standard', { count: std })}
                </span>
            </span>
            <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span className={premTone}>
                    {t('paperSetup.subSteps.corpus.balance.premium', { count: prem })}
                </span>
            </span>
        </div>
    );
}

function toneFor(value: number, lowThreshold: number): string {
    if (value === 0) return 'text-destructive font-medium';
    if (value < lowThreshold) return 'text-warning font-medium';
    return 'text-foreground';
}
