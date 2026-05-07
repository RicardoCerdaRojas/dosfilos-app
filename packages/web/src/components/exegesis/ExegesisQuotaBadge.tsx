import { Sparkles, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { useExegesisQuota } from '@/hooks/exegesis/useExegesisQuota';
import { ExegesisOutOfCreditsDialog } from './ExegesisOutOfCreditsDialog';

interface ExegesisQuotaBadgeProps {
    /**
     * Optional handler when the user clicks "Comprar pack" inside the
     * out-of-credits dialog. Wire to `setCreditPacksOpen(true)` (or
     * the dialog the surface uses for pack purchase).
     */
    onBuyPacks?: () => void;
    /** Optional handler for "Upgrade plan" — wires to settings/billing nav. */
    onUpgradePlan?: () => void;
    /**
     * Visual size. `'compact'` for inline header chip, `'banner'` for
     * full-width contextual banner on module landing pages.
     */
    variant?: 'compact' | 'banner';
}

/**
 * Persistent quota indicator. Two visual modes:
 *
 *   - `'compact'` (default): pill chip "{N} estudios" with severity color
 *     by `capState`. Click opens the out-of-credits dialog (always
 *     useful, even when state is `ok` — it shows the breakdown).
 *   - `'banner'`: full-width card. Used on module landing pages so the
 *     user sees their ceiling before starting work.
 *
 * Hidden when the user isn't authenticated or the balance hasn't
 * loaded yet (avoids flash of empty state).
 */
export function ExegesisQuotaBadge({
    onBuyPacks,
    onUpgradePlan,
    variant = 'compact',
}: ExegesisQuotaBadgeProps) {
    const { t } = useTranslation('exegesis');
    const quota = useExegesisQuota();
    const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

    if (!quota) return null;

    const tone = TONE_BY_STATE[quota.capState];
    const Icon = quota.capState === 'ok' ? Sparkles : ShieldAlert;

    if (variant === 'banner') {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setOutOfCreditsOpen(true)}
                    className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors',
                        tone.bannerClass,
                    )}
                >
                    <Icon className={cn('h-5 w-5 shrink-0', tone.iconClass)} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                            {quota.noAccess
                                ? t('quota.badge.noAccessTitle')
                                : t('quota.badge.bannerTitle', {
                                    studies: quota.remainingStudies.toFixed(1),
                                    total: ((quota.totalBudgetUsd) / 2).toFixed(0),
                                })}
                        </p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                            {quota.noAccess
                                ? t('quota.badge.noAccessHint')
                                : quota.capState === 'hard-cap'
                                    ? t('quota.badge.hardCapHint')
                                    : quota.capState === 'soft-warn'
                                        ? t('quota.badge.softWarnHint')
                                        : t('quota.badge.okHint')}
                        </p>
                    </div>
                    <span className="text-[11px] underline">{t('quota.badge.actionCta')}</span>
                </button>
                <ExegesisOutOfCreditsDialog
                    open={outOfCreditsOpen}
                    onOpenChange={setOutOfCreditsOpen}
                    onBuyPacks={onBuyPacks}
                    onUpgradePlan={onUpgradePlan}
                />
            </>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOutOfCreditsOpen(true)}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    tone.compactClass,
                )}
                title={t('quota.badge.compactTooltip')}
            >
                <Icon className="h-3 w-3" />
                <span className="font-medium">
                    {quota.noAccess
                        ? t('quota.badge.compactNoAccess')
                        : t('quota.badge.compactRemaining', {
                            studies: quota.remainingStudies.toFixed(1),
                        })}
                </span>
            </button>
            <ExegesisOutOfCreditsDialog
                open={outOfCreditsOpen}
                onOpenChange={setOutOfCreditsOpen}
                onBuyPacks={onBuyPacks}
                onUpgradePlan={onUpgradePlan}
            />
        </>
    );
}

const TONE_BY_STATE: Record<'ok' | 'soft-warn' | 'hard-cap', {
    iconClass: string;
    compactClass: string;
    bannerClass: string;
}> = {
    ok: {
        iconClass: 'text-emerald-600',
        compactClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
        bannerClass: 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 hover:bg-emerald-100/80',
    },
    'soft-warn': {
        iconClass: 'text-amber-600',
        compactClass: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 hover:bg-amber-100',
        bannerClass: 'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 hover:bg-amber-100',
    },
    'hard-cap': {
        iconClass: 'text-rose-600',
        compactClass: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 hover:bg-rose-100',
        bannerClass: 'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100 hover:bg-rose-100',
    },
};
