import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

/** Final CTA section — last call to action before the footer. Dark with subtle radial glow. */
export function FinalCTA() {
    const { t } = useTranslation('landing');
    return (
        <section className="relative bg-slate-950 text-white py-28 md:py-36 px-6 lg:px-10 overflow-hidden">
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-50"
                style={{
                    background:
                        'radial-gradient(ellipse 1000px 500px at 50% 100%, rgba(99,102,241,0.15), transparent 60%)',
                }}
            />
            <div className="relative max-w-3xl mx-auto text-center">
                <Reveal>
                    <h2 className="font-reading text-[40px] md:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] mb-8">
                        {t('finalCta.heading')}
                    </h2>
                    <p className="text-[16.5px] text-slate-400 leading-relaxed mb-10 max-w-xl mx-auto">
                        {t('finalCta.description')}
                    </p>
                    <Link
                        to="/register?plan=free"
                        onClick={() => track('cta_finalcta_click', { destination: 'register_free' })}
                    >
                        <Button className="bg-white text-slate-900 hover:bg-slate-200 h-12 px-7 rounded-md text-[14px] font-medium gap-1.5">
                            {t('finalCta.cta')}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                    <p className="text-[12px] text-slate-500 mt-6">
                        {t('finalCta.disclaimer')}
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
