import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { useTranslation } from '@/i18n';
import { HeroCarousel } from './HeroCarousel';
import { TutorsMock } from '../mocks/TutorsMock';

/**
 * Hero section — split layout with text block on the left and an
 * auto-advancing product carousel on the right.
 */
export function Hero() {
    const { t } = useTranslation('landing');
    return (
        <section className="relative bg-slate-950 text-white overflow-hidden">
            {/* Subtle radial glow, single accent */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-60 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 1200px 600px at 30% -100px, rgba(99,102,241,0.14), transparent 65%)',
                }}
            />
            {/* Architectural grid */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    maskImage: 'radial-gradient(ellipse 70% 80% at 40% 40%, black 30%, transparent 85%)',
                }}
            />

            <div className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 lg:px-10 max-w-[1400px] mx-auto">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    <div className="lg:col-span-6">
                        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 mb-8 animate-fade-up">
                            <span className="h-1 w-1 rounded-full bg-indigo-400" />
                            {t('hero.eyebrow')}
                        </div>

                        <h1
                            className="font-reading text-[44px] sm:text-[56px] md:text-[64px] lg:text-[76px] leading-[1.0] tracking-[-0.025em] text-white mb-6 animate-fade-up"
                            style={{ animationDelay: '100ms' }}
                        >
                            {t('hero.title')}
                        </h1>

                        <p
                            className="font-reading text-[20px] md:text-[24px] leading-snug text-slate-300 mb-6 animate-fade-up max-w-xl"
                            style={{ animationDelay: '200ms' }}
                        >
                            {t('hero.subtitle')}
                        </p>

                        <p
                            className="text-[14px] text-slate-400 italic mb-10 animate-fade-up max-w-xl"
                            style={{ animationDelay: '250ms' }}
                        >
                            {t('hero.disclaimer')}
                        </p>

                        <div
                            className="flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-fade-up"
                            style={{ animationDelay: '300ms' }}
                        >
                            <Link
                                to="/register?plan=free"
                                onClick={() => track('cta_hero_click', { destination: 'register_free' })}
                            >
                                <Button className="bg-white text-slate-900 hover:bg-slate-200 h-11 px-6 rounded-md text-[14px] font-medium gap-1.5">
                                    {t('hero.ctaPrimary')}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                            <a
                                href="#como-funciona"
                                onClick={() => track('cta_secondary_click', { destination: 'como_funciona' })}
                                className="text-slate-400 hover:text-white text-[14px] transition-colors inline-flex items-center gap-1 px-3 py-2"
                            >
                                {t('hero.ctaSecondary')}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </a>
                        </div>

                        <p
                            className="text-[12px] text-slate-500 mt-6 animate-fade-up"
                            style={{ animationDelay: '400ms' }}
                        >
                            {t('hero.noCommitment')}
                        </p>

                        {/* Tertiary off-ramp — for visitors not ready to
                            sign up but willing to leave an email for a
                            free resource. Pill treatment with icon +
                            border gives it enough visual weight to be
                            noticed without competing with the primary
                            white CTA above. */}
                        <Link
                            to="/recursos/manual-para-predicadores?utm_source=landing&utm_medium=hero_link&utm_campaign=manual_predicacion"
                            onClick={() => track('cta_secondary_click', { destination: 'lead_magnet_manual' })}
                            className="inline-flex items-center gap-2 mt-8 px-4 py-2.5 rounded-md border border-indigo-400/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400/50 text-[13.5px] text-indigo-200 hover:text-white transition-colors animate-fade-up group"
                            style={{ animationDelay: '450ms' }}
                        >
                            <BookOpen className="h-4 w-4 text-indigo-300 group-hover:text-white transition-colors" strokeWidth={1.5} />
                            <span>
                                <span className="text-slate-400 group-hover:text-slate-300 transition-colors">{t('hero.leadMagnetPrefix')}</span>{' '}
                                {t('hero.leadMagnetText')}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div
                        className="lg:col-span-6 animate-fade-up"
                        style={{ animationDelay: '500ms' }}
                    >
                        {/* Desktop: the rotating product carousel. Mobile: a
                            single welcoming screen (tutor routing) instead.
                            A cold mobile visitor — most of our Facebook/WhatsApp
                            traffic — would otherwise meet a Hebrew/Greek
                            morphology panel as the second thing on screen, which
                            reads "not for me". The full demos still live, well
                            explained, in the Pillars section below. */}
                        <div className="hidden lg:block">
                            <HeroCarousel />
                        </div>
                        <div className="lg:hidden">
                            <TutorsMock />
                        </div>
                    </div>
                </div>

                <div
                    className="mt-20 md:mt-28 pt-12 md:pt-16 border-t border-white/10 max-w-4xl animate-fade-up"
                    style={{ animationDelay: '600ms' }}
                >
                    <p className="text-[15px] md:text-[16px] leading-[1.7] text-slate-400">
                        <span className="text-white">{t('hero.footerLead')}</span>{' '}
                        {t('hero.footerBody')}
                    </p>
                </div>
            </div>
        </section>
    );
}
