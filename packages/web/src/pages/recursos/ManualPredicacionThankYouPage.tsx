import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';
import { LANDING_STYLES } from '../landing/shared/landingStyles';

/**
 * Thank-you page shown immediately after the lead form submits.
 *
 * Two jobs:
 *   1. Confirm the email is on its way + manage expectations
 *      (check spam, may take a minute).
 *   2. Soft-CTA to register a free Preach account. The visitor
 *      already shared an email and trusted us — the moment the
 *      lead capture succeeds is the warmest signup window we have.
 *
 * No form here. The downloaded PDF gets delivered by Resend; this
 * page exists to bridge from "I got their email" to "they're using
 * Preach".
 */
export function ManualPredicacionThankYouPage() {
    useEffect(() => {
        // Page hit means the form submitted successfully. Worth a
        // dedicated event so Meta lookalike audiences can pivot on
        // "people who completed the lead capture" specifically.
        track('lead_magnet_downloaded', { magnet: 'manual-para-predicadores' });
    }, []);

    return (
        <div className="bg-white text-slate-900 antialiased" style={{ colorScheme: 'light' }}>
            <style>{LANDING_STYLES}</style>

            {/* Minimal nav — same chrome as the lead-capture page so
                the transition feels continuous. */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center" aria-label="Preach DosFilos">
                            <span
                                className="block h-10 w-[120px] bg-white"
                                style={{
                                    WebkitMaskImage: 'url(/logo_dfp.png)',
                                    maskImage: 'url(/logo_dfp.png)',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                }}
                            />
                        </Link>
                        <Link
                            to="/"
                            className="text-slate-400 hover:text-white text-[13px] transition-colors"
                        >
                            Conoce Preach →
                        </Link>
                    </div>
                </div>
            </nav>

            <section className="relative bg-slate-950 text-white overflow-hidden min-h-screen">
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-60 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse 1200px 600px at 50% -100px, rgba(99,102,241,0.14), transparent 65%)',
                    }}
                />
                <div className="relative pt-40 pb-24 px-6 lg:px-10 max-w-[800px] mx-auto text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-8">
                        <CheckCircle2 className="h-7 w-7 text-emerald-400" strokeWidth={1.5} />
                    </div>

                    <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-300 mb-6">
                        <span className="h-1 w-1 rounded-full bg-indigo-400" />
                        Manual enviado
                    </div>

                    <h1 className="font-reading text-[36px] md:text-[48px] lg:text-[56px] leading-[1.05] tracking-[-0.025em] text-white mb-6">
                        Revisa tu bandeja de entrada.
                    </h1>

                    <p className="font-reading text-[18px] md:text-[20px] leading-snug text-slate-300 mb-3 max-w-2xl mx-auto">
                        Acabamos de enviarte el manual de predicación expositiva.
                    </p>

                    <p className="text-[14.5px] text-slate-400 leading-relaxed mb-12 max-w-2xl mx-auto inline-flex items-start gap-2 justify-center">
                        <Mail className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                        <span>
                            Si no lo ves en unos minutos, revisa tu carpeta de spam o promociones.
                            El enlace al PDF estará activo durante 30 días.
                        </span>
                    </p>

                    {/* Soft CTA — warmest signup moment we have. The
                        visitor just trusted us with an email, so we
                        ask for the next step (free account) instead
                        of dropping them. */}
                    <div className="border-t border-white/10 pt-12 max-w-xl mx-auto">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300 font-medium mb-4">
                            Mientras revisas el manual
                        </p>
                        <h2 className="font-reading text-[24px] md:text-[28px] leading-tight text-white mb-4">
                            Conoce Preach. Sin tarjeta, sin compromiso.
                        </h2>
                        <p className="text-[14.5px] text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
                            La plataforma que reúne biblioteca, idiomas bíblicos, tutores
                            especializados y producción ministerial —para que el manual no
                            quede solo en tu inbox.
                        </p>

                        <Link
                            to="/register?plan=free&utm_source=lead_magnet&utm_medium=thank_you&utm_campaign=manual_predicacion"
                            onClick={() => track('cta_hero_click', {
                                source: 'lead_magnet_thank_you',
                                destination: 'register_free',
                            })}
                        >
                            <Button className="bg-white text-slate-900 hover:bg-slate-200 h-11 px-6 rounded-md text-[14px] font-medium gap-1.5">
                                Empezar gratis sin tarjeta
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
