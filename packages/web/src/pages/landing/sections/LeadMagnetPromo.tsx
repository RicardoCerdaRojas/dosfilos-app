import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

/**
 * Lead-magnet promo block — secondary conversion path for visitors
 * who landed on the main page but aren't ready for the commercial
 * commitment Pricing just asked for.
 *
 * Positioning rationale:
 *   - Lives between Pricing and FAQ. Visitor has just seen the
 *     price; the magnet is the soft off-ramp ("if you're not ready,
 *     here's something free that still moves the relationship
 *     forward"). Without this surface, that visitor bounces.
 *   - Visually distinct from the surrounding sections — slate-50
 *     background + a single product-card layout — so it reads as
 *     a separate offer rather than another product feature.
 *   - Routes to `/recursos/manual-para-predicadores` with explicit
 *     UTM attribution (`utm_source=landing&utm_medium=promo_section`)
 *     so the admin dashboard can see which leads came from the main
 *     landing vs which came directly from Meta ads.
 */
export function LeadMagnetPromo() {
    const { t } = useTranslation('landing');
    const bullets = t('leadMagnet.bullets', { returnObjects: true }) as string[];
    const coverBullets = t('leadMagnet.coverBullets', { returnObjects: true }) as string[];
    return (
        <section className="bg-slate-50 py-20 md:py-28 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[1100px] mx-auto">
                <Reveal>
                    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                        <div className="grid md:grid-cols-2 gap-0">
                            <div className="p-10 md:p-14">
                                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-6">
                                    <span className="h-1 w-1 rounded-full bg-indigo-600" />
                                    {t('leadMagnet.badge')}
                                </div>

                                <h2 className="font-reading text-[28px] md:text-[36px] lg:text-[40px] leading-[1.1] tracking-[-0.02em] text-slate-900 mb-5">
                                    {t('leadMagnet.heading')}
                                </h2>

                                <p className="text-[15.5px] text-slate-600 leading-[1.65] mb-6 max-w-md">
                                    {t('leadMagnet.description')}
                                </p>

                                <ul className="space-y-2 mb-8 max-w-md">
                                    {bullets.map(item => (
                                        <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                                            <CheckCircle2 className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to="/recursos/manual-para-predicadores?utm_source=landing&utm_medium=promo_section&utm_campaign=manual_predicacion"
                                    onClick={() => track('cta_secondary_click', { destination: 'lead_magnet_manual', source: 'promo_section' })}
                                >
                                    <Button className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 rounded-md text-[14px] font-medium gap-1.5">
                                        {t('leadMagnet.cta')}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>

                                <p className="text-[11.5px] text-slate-500 mt-4">
                                    {t('leadMagnet.disclaimer')}
                                </p>
                            </div>

                            <div className="bg-slate-950 text-white p-10 md:p-14 flex flex-col justify-center relative overflow-hidden">
                                <div
                                    aria-hidden
                                    className="absolute inset-0 opacity-50 pointer-events-none"
                                    style={{
                                        background:
                                            'radial-gradient(ellipse 600px 400px at 80% 20%, rgba(99,102,241,0.14), transparent 60%)',
                                    }}
                                />
                                <div className="relative">
                                    <BookOpen className="h-14 w-14 text-indigo-300 mb-6" strokeWidth={1.2} />
                                    <div className="font-reading text-[24px] md:text-[28px] leading-[1.15] text-white mb-3">
                                        {t('leadMagnet.coverTitle')}
                                    </div>
                                    <div className="text-[12px] text-slate-400 uppercase tracking-[0.15em] mb-6">
                                        {t('leadMagnet.coverBrand')}
                                    </div>
                                    <ul className="space-y-1.5 text-[13.5px] text-slate-400 leading-relaxed">
                                        {coverBullets.map(item => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                    <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-slate-500 uppercase tracking-[0.15em]">
                                        {t('leadMagnet.coverFooter')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
