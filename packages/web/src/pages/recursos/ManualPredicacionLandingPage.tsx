import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCaptureLead } from '@/hooks/useCaptureLead';
import { track, ScrollDepthTracker } from '@/lib/analytics';
import { LANDING_STYLES } from '../landing/shared/landingStyles';

/**
 * Lead-magnet landing — single-purpose page that captures the email
 * in exchange for the preaching manual PDF. Reachable at
 * `/recursos/manual-para-predicadores`.
 *
 * Design intent:
 *   - Different from the main `/` — focused on ONE conversion. Nav is
 *     stripped down to just the logo so the form is the obvious next
 *     action.
 *   - Editorial dark hero matches the rest of the brand language.
 *   - Below-the-fold section explains what the manual contains so
 *     visitors who need more context before submitting can scroll.
 *   - All Meta-ad traffic should hit this URL with UTMs attached —
 *     they're captured by the analytics module and forwarded server-side.
 */
export function ManualPredicacionLandingPage() {
    const navigate = useNavigate();
    const { submit, loading, error } = useCaptureLead();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    // Honeypot — humans never see this field, but naïve scrapers fill
    // every input they encounter. Server silently drops submissions
    // where `website` is non-empty.
    const [website, setWebsite] = useState('');

    useEffect(() => {
        track('lead_magnet_viewed', { magnet: 'manual-para-predicadores' });
    }, []);

    const canSubmit = email.trim().length > 0 && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            await submit({
                email: email.trim(),
                name: name.trim() || undefined,
                leadMagnet: 'manual-para-predicadores',
                website: website.trim() || undefined,
            });
            track('lead_magnet_submitted', {
                magnet: 'manual-para-predicadores',
            });
            navigate('/recursos/manual-para-predicadores/gracias');
        } catch {
            // Error state is surfaced inline by the hook; nothing else
            // to do — keep the form mounted so the visitor can retry.
        }
    };

    return (
        <div className="bg-white text-slate-900 antialiased" style={{ colorScheme: 'light' }}>
            <style>{LANDING_STYLES}</style>
            <ScrollDepthTracker />

            {/* Minimal nav — logo-only by design. Sticky so the brand
                anchor is always visible on long-scroll landings. */}
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

            {/* Hero with form */}
            <section className="relative bg-slate-950 text-white overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-60 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse 1200px 600px at 30% -100px, rgba(99,102,241,0.14), transparent 65%)',
                    }}
                />
                <div className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 lg:px-10 max-w-[1200px] mx-auto">
                    <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                        <div className="lg:col-span-7">
                            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-300 mb-8">
                                <span className="h-1 w-1 rounded-full bg-indigo-400" />
                                Recurso gratuito · PDF
                            </div>

                            <h1 className="font-reading text-[40px] sm:text-[52px] md:text-[60px] leading-[1.0] tracking-[-0.025em] text-white mb-6">
                                Manual de predicación expositiva.
                            </h1>

                            <p className="font-reading text-[19px] md:text-[22px] leading-snug text-slate-300 mb-8 max-w-xl">
                                Una guía práctica para preparar sermones expositivos con
                                metodología histórico-gramatical, fidelidad al texto y orden
                                en el proceso de estudio.
                            </p>

                            <ul className="space-y-2.5 mb-10 max-w-lg">
                                {[
                                    'Cómo pasar del texto bíblico a una estructura predicable',
                                    'Errores frecuentes en la preparación expositiva',
                                    'Checklist semanal del predicador serio',
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-400">
                                        <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-3 max-w-md"
                            >
                                {/* Honeypot — visually hidden, off-screen,
                                    not focusable. Real users never see or
                                    interact with this; scraper bots that
                                    fill every <input> trip it. tabindex
                                    -1 + autocomplete off prevents accidental
                                    focus from accessibility tooling. */}
                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: '-10000px',
                                        top: 'auto',
                                        width: '1px',
                                        height: '1px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <label htmlFor="lm-website">Website (no completar)</label>
                                    <input
                                        type="text"
                                        id="lm-website"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nombre (opcional)"
                                        disabled={loading}
                                        className="bg-white/5 border border-white/10 rounded-md px-3.5 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40 disabled:opacity-50"
                                    />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        disabled={loading}
                                        autoComplete="email"
                                        className="bg-white/5 border border-white/10 rounded-md px-3.5 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40 disabled:opacity-50"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-200 h-11 px-6 rounded-md text-[14px] font-medium gap-1.5"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            Recibir el manual
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </>
                                    )}
                                </Button>

                                {error && (
                                    <p className="text-[13px] text-red-400 mt-2">
                                        {error}
                                    </p>
                                )}

                                <p className="text-[11.5px] text-slate-500 pt-1">
                                    Te enviamos el PDF al correo y, si te sirve, alguna nota
                                    ocasional sobre estudio bíblico serio. Puedes darte de baja
                                    cuando quieras.
                                </p>
                            </form>
                        </div>

                        <div className="lg:col-span-5 hidden lg:block">
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 backdrop-blur p-10">
                                <BookOpen className="h-16 w-16 text-indigo-300 mb-6" strokeWidth={1.2} />
                                <div className="font-reading text-[28px] leading-[1.15] text-white mb-3">
                                    Manual de predicación expositiva
                                </div>
                                <div className="text-[13px] text-slate-400 uppercase tracking-[0.15em] mb-6">
                                    Preach · DosFilos
                                </div>
                                <div className="space-y-2 text-[13.5px] text-slate-400 leading-relaxed">
                                    <p>—Metodología histórico-gramatical</p>
                                    <p>—Estructura del sermón expositivo</p>
                                    <p>—Cómo preparar la introducción y la aplicación</p>
                                    <p>—Checklist semanal del predicador</p>
                                </div>
                                <div className="mt-10 pt-6 border-t border-white/10 text-[11px] text-slate-500 uppercase tracking-[0.15em]">
                                    PDF · gratuito
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust + brief intro to product */}
            <section className="bg-white py-20 md:py-24 px-6 lg:px-10 border-t border-slate-200">
                <div className="max-w-[1100px] mx-auto">
                    <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden mb-12">
                        {[
                            {
                                icon: BookOpen,
                                title: 'Práctico, no abstracto',
                                text: 'El manual va paso a paso por el proceso real de preparación: observación, interpretación, estructura, redacción y aplicación.',
                            },
                            {
                                icon: ShieldCheck,
                                title: 'Histórico-gramatical',
                                text: 'Trabaja desde la convicción de que el texto bíblico es autoritativo y se interpreta por su contexto histórico y gramatical, no por la imaginación del predicador.',
                            },
                            {
                                icon: CheckCircle2,
                                title: 'Para usar esta semana',
                                text: 'Incluye un checklist de preparación que puedes aplicar a tu próximo sermón sin necesidad de leer el manual completo primero.',
                            },
                        ].map(({ icon: Icon, title, text }) => (
                            <div key={title} className="bg-white p-8 h-full">
                                <Icon className="h-5 w-5 text-indigo-600 mb-4" strokeWidth={1.5} />
                                <h3 className="font-reading text-[20px] text-slate-900 mb-3 tracking-tight">
                                    {title}
                                </h3>
                                <p className="text-[14px] text-slate-600 leading-[1.65]">
                                    {text}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-[14px] text-slate-500 leading-relaxed">
                            Preparado por el equipo de Preach —la plataforma para pastores,
                            predicadores, seminaristas y profesores que quieren estudiar la
                            Palabra con rigor y servir al ministerio con fidelidad.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 text-[13.5px] text-indigo-700 hover:text-indigo-900 mt-4"
                        >
                            Conoce Preach
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
