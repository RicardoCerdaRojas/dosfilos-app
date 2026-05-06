import { Zap, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { usePageBalance } from '@/hooks/usePageBalance';

const STD_LOW_THRESHOLD = 200;
const PREM_LOW_THRESHOLD = 20;

/**
 * Compact warning pill that surfaces the user's processing balance
 * ONLY when it's low or empty. Earlier versions showed the saldo at
 * all times, but with a typical balance of thousands of pages the
 * numbers were noise that competed with the corpus task itself. Now
 * the pill stays hidden until the user is genuinely close to the cap
 * — a "safety net" UX rather than ambient telemetry.
 *
 * Color tone:
 *   - both balances above their low thresholds → render nothing.
 *   - either at low threshold → warning.
 *   - either at zero → destructive.
 *
 * Thresholds are absolute (200 std / 20 prem) so we don't fetch the
 * plan doc here — keeping the component dependency-light for fast
 * first paint.
 */
export function PageBalanceHint() {
    const { t } = useTranslation('exegesis');
    const { data: balance } = usePageBalance();

    if (!balance) return null;

    const std = balance.standardPagesAvailable;
    const prem = balance.premiumPagesAvailable;
    const stdLow = std < STD_LOW_THRESHOLD;
    const premLow = prem < PREM_LOW_THRESHOLD;

    // High balance — silently hide. The user can always check from
    // the dashboard / subscription pages; corpus tab doesn't need to
    // remind them constantly.
    if (!stdLow && !premLow) return null;

    return (
        <div className="inline-flex items-center gap-3 text-[11px]">
            {stdLow && (
                <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span className={toneFor(std)}>
                        {t('paperSetup.subSteps.corpus.balance.standard', { count: std })}
                    </span>
                </span>
            )}
            {premLow && (
                <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span className={toneFor(prem)}>
                        {t('paperSetup.subSteps.corpus.balance.premium', { count: prem })}
                    </span>
                </span>
            )}
        </div>
    );
}

function toneFor(value: number): string {
    if (value === 0) return 'text-destructive font-medium';
    return 'text-warning font-medium';
}
