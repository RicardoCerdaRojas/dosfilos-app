import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap } from 'lucide-react';
import { PlanMetadata } from '@dosfilos/domain';
import { getFeatureLabel } from '@/utils/featureLabels';
import { cn } from '@/lib/utils';

interface PlanCardProps {
    plan: PlanMetadata;
    isPopular?: boolean;
    ctaLabel: string;
    onCtaClick: () => void;
    ctaVariant?: 'default' | 'outline' | 'secondary';
    showCurrentBadge?: boolean;
}

/**
 * Tiered visual treatment for the pricing decision surface:
 *
 *  - Free       → muted bg, ghost CTA. "Try it" affordance, less weight.
 *  - Standard   → white card, dark CTA. Default tier.
 *  - Popular    → elevated, gradient accent, integrated badge strip.
 *  - Premium*   → reserved for future top-tier (currently same as Standard).
 *
 * The variant is derived implicitly from `isPopular` + `priceMonthly === 0`
 * so the call sites don't need to pass extra props.
 */
export function PlanCard({
    plan,
    isPopular = false,
    ctaLabel,
    onCtaClick,
    ctaVariant,
    showCurrentBadge = false,
}: PlanCardProps) {
    const isFree = plan.priceMonthly === 0;

    // Split price into integer + decimal parts for editorial typography.
    const priceInt = Math.floor(plan.priceMonthly);
    const priceDecRaw = (plan.priceMonthly % 1) * 100;
    const priceDec = priceDecRaw > 0 ? priceDecRaw.toFixed(0).padStart(2, '0') : null;

    // Derive CTA variant from tier intent if caller didn't override.
    const resolvedCtaVariant = ctaVariant ?? (isFree ? 'outline' : 'default');

    return (
        <Card
            className={cn(
                'relative flex flex-col h-full overflow-hidden transition-all',
                isPopular
                    ? 'border-primary/40 shadow-xl shadow-primary/10 bg-gradient-to-b from-white via-primary/[0.02] to-white'
                    : isFree
                        ? 'border-slate-200/70 bg-slate-50/50 shadow-none'
                        : 'border-slate-200 bg-white shadow-sm hover:shadow-md',
            )}
        >
            {/* Popular ribbon — integrated, not floating */}
            {isPopular && (
                <div className="bg-gradient-to-r from-primary via-primary to-primary/90 px-4 py-1.5 text-center">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                        <Zap className="h-3 w-3" strokeWidth={2.5} />
                        Más Popular
                    </span>
                </div>
            )}

            {showCurrentBadge && (
                <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        Actual
                    </span>
                </div>
            )}

            <CardHeader className="pt-6 pb-4">
                <CardTitle className="font-reading text-[26px] leading-none font-bold text-slate-900">
                    {plan.name}
                </CardTitle>
                <CardDescription className="text-[13.5px] text-slate-600 mt-2 leading-relaxed min-h-[3rem]">
                    {plan.description}
                </CardDescription>

                {/* Price — editorial treatment */}
                <div className="mt-5 flex items-baseline gap-0.5">
                    {isFree ? (
                        <span className="font-reading text-[44px] leading-none font-bold text-slate-900">
                            Gratis
                        </span>
                    ) : (
                        <>
                            <span className="text-[20px] font-medium text-slate-400 self-start mt-2">$</span>
                            <span className="font-reading text-[48px] leading-none font-bold text-slate-900 tabular-nums">
                                {priceInt}
                            </span>
                            {priceDec && (
                                <span className="text-[18px] font-medium text-slate-500 tabular-nums self-start mt-2">
                                    .{priceDec}
                                </span>
                            )}
                            <span className="text-[13px] text-slate-500 ml-1.5 self-end mb-1.5">/ mes</span>
                        </>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pb-6">
                <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                            <span
                                className={cn(
                                    'flex-shrink-0 mt-[3px] flex h-4 w-4 items-center justify-center rounded-full',
                                    isPopular ? 'bg-primary/10' : 'bg-slate-100',
                                )}
                            >
                                <Check
                                    className={cn('h-2.5 w-2.5', isPopular ? 'text-primary' : 'text-slate-700')}
                                    strokeWidth={3.5}
                                />
                            </span>
                            <span className="text-[13.5px] text-slate-700 leading-relaxed">
                                {getFeatureLabel(feature)}
                            </span>
                        </li>
                    ))}
                </ul>

                <Button
                    variant={resolvedCtaVariant}
                    className={cn(
                        'w-full h-11 font-medium text-[14px]',
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
