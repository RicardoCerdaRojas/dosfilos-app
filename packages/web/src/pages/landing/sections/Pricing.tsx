import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PlanCard } from '@/components/subscription/PlanCard';
import { FreeTierBanner } from '@/components/subscription/FreeTierBanner';
import { getPlanPriceId } from '@/hooks/usePlans';
import { Reveal } from '../shared/Reveal';

interface PricingProps {
    plans: any[];
    loading: boolean;
    onPlanSelect: (planId: string) => void;
}

/** Pricing section — fetches plans via hook in parent and shows public ones. */
export function Pricing({ plans, loading, onPlanSelect }: PricingProps) {
    return (
        <section id="precios" className="bg-slate-50 py-16 md:py-20 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[1200px] mx-auto">
                <Reveal>
                    <div className="text-center max-w-2xl mx-auto mb-8">
                        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-3">
                            <span>Precios</span>
                        </div>
                        <h2 className="font-reading text-[32px] md:text-[42px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-4">
                            Elige cómo quieres empezar.
                        </h2>
                        <p className="text-[15px] text-slate-600 leading-snug">
                            Puedes probar Preach gratis sin tarjeta, o activar 30 días gratis
                            en cualquier plan pagado. Cancelas cuando quieras.
                        </p>
                    </div>
                </Reveal>

                {loading ? (
                    <div className="text-center text-slate-500 mt-10">Cargando planes...</div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-3 gap-4 mt-6">
                            {plans
                                .filter(p => p.isPublic && p.pricing.monthly > 0)
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(plan => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={{
                                            id: plan.id,
                                            name: plan.name,
                                            description: plan.description,
                                            priceMonthly: plan.pricing.monthly,
                                            stripePriceId: getPlanPriceId(plan),
                                            features: plan.features,
                                            sortOrder: plan.sortOrder,
                                            isPublic: plan.isPublic,
                                        }}
                                        standardPagesPerMonth={plan.limits?.standardPagesPerMonth}
                                        premiumPagesPerMonth={plan.limits?.premiumPagesPerMonth}
                                        exegesisUsdPerMonth={plan.limits?.exegesisUsdPerMonth}
                                        isPopular={plan.highlightText === 'Más Popular'}
                                        ctaLabel="Empezar 30 días gratis"
                                        onCtaClick={() => onPlanSelect(plan.id)}
                                    />
                                ))}
                        </div>

                        <FreeTierBanner onCtaClick={() => onPlanSelect('free')} />
                    </>
                )}

                <div className="text-center mt-6">
                    <Link
                        to="/pricing"
                        className="inline-flex items-center gap-1 text-[12.5px] text-slate-500 hover:text-indigo-700 transition-colors"
                    >
                        Ver detalle completo de planes
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
