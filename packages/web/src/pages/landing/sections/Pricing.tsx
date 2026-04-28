import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { PlanCard } from '@/components/subscription/PlanCard';
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
        <section id="precios" className="bg-slate-50 py-28 md:py-36 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[1200px] mx-auto">
                <Reveal>
                    <div className="text-center max-w-2xl mx-auto mb-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            Precios
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-6">
                            Elige el plan que se ajusta a tu ministerio.
                        </h2>
                        <div className="inline-flex items-center gap-2 text-[13px] text-slate-600 bg-white border border-slate-200 rounded-full px-3.5 py-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            30 días gratis en cualquier plan · cancela cuando quieras
                        </div>
                    </div>
                </Reveal>

                {loading ? (
                    <div className="text-center text-slate-500 mt-10">Cargando planes...</div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-5 mt-12">
                        {plans
                            .filter(p => p.isPublic && p.pricing.monthly > 0)
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
                                    isPopular={plan.highlightText === 'Más Popular'}
                                    ctaLabel="Empezar 30 días gratis"
                                    onCtaClick={() => onPlanSelect(plan.id)}
                                    ctaVariant="default"
                                />
                            ))}
                    </div>
                )}

                <div className="text-center mt-10">
                    <Link
                        to="/pricing"
                        className="inline-flex items-center gap-1 text-[13px] text-slate-600 hover:text-indigo-700 transition-colors"
                    >
                        Ver detalle completo de planes
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
