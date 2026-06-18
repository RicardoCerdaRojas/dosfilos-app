import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const APP = 'https://app.preach.dosfilos.com';

const NAV_HREFS = [
    '#problema',
    '#pilar-1',
    '#como-funciona',
    '#filosofia',
    '#casos-de-uso',
    '#precios',
    '#faq',
];

export interface NavProps {
    lang: 'es' | 'en';
    navLabels: string[];
    signIn: string;
    startFree: string;
    menu: string;
}

/**
 * Sticky landing-page navigation. Becomes more opaque after the user scrolls
 * past the hero. On mobile, opens a full-width menu drawer. Scroll-spy keeps
 * the active link in sync with the visible section.
 */
export function Nav({ lang, navLabels, signIn, startFree, menu }: NavProps) {
    const navLinks: Array<[string, string]> = NAV_HREFS.map((href, i) => [navLabels[i], href]);
    const [scrolled, setScrolled] = useState(false);
    const [activeHref, setActiveHref] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const otherLang = lang === 'es' ? 'en' : 'es';

    useEffect(() => {
        const THRESHOLD = 140;
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
            let current = '';
            for (const href of NAV_HREFS) {
                const el = document.getElementById(href.slice(1));
                if (el && el.getBoundingClientRect().top <= THRESHOLD) current = href;
            }
            setActiveHref(current);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                scrolled
                    ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5'
                    : 'bg-slate-950/60 backdrop-blur-sm'
            }`}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                <div className="flex justify-between items-center h-20">
                    <a href={`/${lang}/`} className="flex items-center group" aria-label="Preach DosFilos">
                        <span
                            className="block h-14 w-[168px] bg-white transition-transform group-hover:scale-[1.02]"
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
                    </a>

                    <div className="hidden md:flex items-center gap-1 text-[13px]">
                        {navLinks.map(([label, href]) => (
                            <a
                                key={href}
                                href={href}
                                aria-current={activeHref === href ? 'true' : undefined}
                                data-track="nav_link_click"
                                data-track-label={label}
                                data-track-href={href}
                                className={`px-3 py-1.5 rounded-md transition-colors ${
                                    activeHref === href
                                        ? 'text-white bg-white/5'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {label}
                            </a>
                        ))}
                        <div className="mx-3 h-4 w-px bg-white/10" />
                        <a
                            href={`/${otherLang}/`}
                            className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white transition-colors uppercase text-[12px] tracking-wide"
                            aria-label={otherLang === 'en' ? 'English' : 'Español'}
                        >
                            {otherLang}
                        </a>
                        <a
                            href={`${APP}/login`}
                            className="inline-flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 text-[13px] font-normal h-8 px-3 rounded-md transition-colors"
                        >
                            {signIn}
                        </a>
                        <a
                            href={`${APP}/register?plan=free`}
                            data-track="cta_hero_click"
                            data-track-source="nav"
                            data-track-dest="register_free"
                            className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-200 text-[13px] font-medium h-8 rounded-md ml-1 px-3.5 transition-colors"
                        >
                            {startFree}
                        </a>
                    </div>

                    <button
                        type="button"
                        className="md:hidden p-2 -mr-2 text-white"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={menu}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden bg-slate-950 border-t border-white/5">
                    <div className="px-6 py-4 space-y-1">
                        {navLinks.map(([label, href]) => (
                            <a
                                key={href}
                                href={href}
                                aria-current={activeHref === href ? 'true' : undefined}
                                onClick={() => setMobileOpen(false)}
                                className={`block py-2.5 text-sm ${
                                    activeHref === href ? 'text-white font-medium' : 'text-slate-300'
                                }`}
                            >
                                {label}
                            </a>
                        ))}
                        <div className="pt-3 flex gap-2">
                            <a
                                href={`${APP}/login`}
                                className="flex-1 inline-flex items-center justify-center h-10 rounded-md text-slate-300 hover:bg-white/5 transition-colors"
                            >
                                {signIn}
                            </a>
                            <a
                                href={`${APP}/register?plan=free`}
                                data-track="cta_hero_click"
                                data-track-source="nav_mobile"
                                data-track-dest="register_free"
                                className="flex-1 inline-flex items-center justify-center h-10 rounded-md bg-white text-slate-900 font-medium"
                            >
                                {startFree}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
