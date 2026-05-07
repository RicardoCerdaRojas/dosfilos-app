import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { PlanMetadata } from '@dosfilos/domain';
import { getFeatureLabel } from '@/utils/featureLabels';
import { cn } from '@/lib/utils';
import { ProcessingQuotaBlock } from '@/components/plans/ProcessingQuotaBlock';

interface PlanCardProps {
    plan: PlanMetadata;
    isPopular?: boolean;
    ctaLabel: string;
    onCtaClick: () => void;
    ctaVariant?: 'default' | 'outline' | 'secondary';
    showCurrentBadge?: boolean;
    /**
     * Optional monthly processing quota included in the plan. When
     * provided, renders a "Incluye cada mes" block above the feature
     * list with the standard + premium page counts. Pass undefined
     * (or both zero) to hide the block — the Free plan does this
     * naturally since its quota is 0/0.
     */
    standardPagesPerMonth?: number;
    premiumPagesPerMonth?: number;
    exegesisUsdPerMonth?: number;
}

/**
 * Tiered visual treatment for the pricing decision surface.
 *
 *  - Standard   → white card, dark CTA, subtle hover.
 *  - Popular    → tinted gradient bg, primary-shadow, inline pill in header.
 *  - Free       → reserved for future inline use (currently promoted to a
 *                 standalone banner outside the grid; see FreeTierBanner).
 *
 * "Más popular" is rendered as an inline pill in the title row rather than
 * a top ribbon — the ribbon collided with shadcn Card's default `py-6`
 * leaving a white sliver above it AND made the popular card 24px taller
 * than its siblings. The inline pill keeps grid alignment perfect.
 *
 * Shadcn Card defaults to `py-6 gap-6` which is too generous for a
 * comparison grid; we override with `py-5 gap-3` for density.
 */
export function PlanCard({
    plan,
    isPopular = false,
    ctaLabel,
    onCtaClick,
    ctaVariant,
    showCurrentBadge = false,
    standardPagesPerMonth,
    premiumPagesPerMonth,
    exegesisUsdPerMonth,
}: PlanCardProps) {
    const isFree = plan.priceMonthly === 0;

    // Split price into integer + decimal parts for editorial typography.
    const priceInt = Math.floor(plan.priceMonthly);
    const priceDecRaw = (plan.priceMonthly % 1) * 100;
    const priceDec = priceDecRaw > 0 ? priceDecRaw.toFixed(0).padStart(2, '0') : null;

    const resolvedCtaVariant = ctaVariant ?? (isFree ? 'outline' : 'default');

    return (
        <Card
            className={cn(
                'relative flex flex-col h-full !py-5 !gap-3 transition-all',
                isPopular
                    ? 'border-primary/40 shadow-xl shadow-primary/10 bg-gradient-to-b from-primary/[0.04] via-white to-white'
                    : 'border-slate-200 bg-white shadow-sm hover:shadow-md',
            )}
        >
            {showCurrentBadge && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        Actual
                    </span>
                </div>
            )}

            <CardHeader className="!px-5">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-reading text-[22px] leading-none font-bold text-slate-900">
                        {plan.name}
                    </CardTitle>
                    {isPopular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                            Más popular
                        </span>
                    )}
                </div>

                <CardDescription className="text-[12.5px] text-slate-600 mt-1.5 leading-snug">
                    {plan.description}
                </CardDescription>

                <div className="mt-3 flex items-baseline gap-0.5">
                    <span className="text-[16px] font-medium text-slate-400 self-start mt-1.5">$</span>
                    <span className="font-reading text-[40px] leading-none font-bold text-slate-900 tabular-nums">
                        {priceInt}
                    </span>
                    {priceDec && (
                        <span className="text-[15px] font-medium text-slate-500 tabular-nums self-start mt-1.5">
                            .{priceDec}
                        </span>
                    )}
                    <span className="text-[12px] text-slate-500 ml-1.5 self-end mb-0.5">/ mes</span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col !px-5 pt-1">
                {/* Monthly processing quota block. Hidden for Free
                    (quota 0/0) so the empty state doesn't compete
                    visually with the paid tiers. */}
                {(standardPagesPerMonth || premiumPagesPerMonth || exegesisUsdPerMonth) ? (
                    <div className="mb-4">
                        <ProcessingQuotaBlock
                            standardPagesPerMonth={standardPagesPerMonth}
                            premiumPagesPerMonth={premiumPagesPerMonth}
                            exegesisUsdPerMonth={exegesisUsdPerMonth}
                        />
                    </div>
                ) : null}

                <ul className="space-y-2 flex-1 mb-4">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <span
                                className={cn(
                                    'flex-shrink-0 mt-[3px] flex h-3.5 w-3.5 items-center justify-center rounded-full',
                                    isPopular ? 'bg-primary/15' : 'bg-slate-100',
                                )}
                            >
                                <Check
                                    className={cn('h-2 w-2', isPopular ? 'text-primary' : 'text-slate-700')}
                                    strokeWidth={4}
                                />
                            </span>
                            <span className="text-[13px] text-slate-700 leading-snug">
                                {getFeatureLabel(feature)}
                            </span>
                        </li>
                    ))}
                </ul>

                <Button
                    variant={resolvedCtaVariant}
                    className={cn(
                        'w-full h-10 font-medium text-[13.5px]',
                        isPopular && 'shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30',
                        isFree && 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )}
                    onClick={onCtaClick}
                >
                    {ctaLabel}
                </Button>
            </CardContent>
        </Card>
    );
}
