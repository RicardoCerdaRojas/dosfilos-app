import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher, useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface NavProps {
    mobileOpen: boolean;
    setMobileOpen: (v: boolean) => void;
}

const NAV_HREFS = [
    '#problema',
    '#pilar-1',
    '#como-funciona',
    '#filosofia',
    '#casos-de-uso',
    '#precios',
    '#faq',
];

/**
 * Sticky landing-page navigation. Becomes more opaque after the user scrolls
 * past the hero. On mobile, opens a full-width menu drawer.
 */
export function Nav({ mobileOpen, setMobileOpen }: NavProps) {
    const { t } = useTranslation('landing');
    const navLabels = t('nav.links', { returnObjects: true }) as string[];
    const navLinks: Array<[string, string]> = NAV_HREFS.map((href, i) => [navLabels[i], href]);
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav
            className={cn(
                'fixed top-0 w-full z-50 transition-all duration-300',
                scrolled
                    ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5'
                    : 'bg-slate-950/60 backdrop-blur-sm'
            )}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                <div className="flex justify-between items-center h-20">
                    <Link to="/" className="flex items-center group" aria-label="Preach DosFilos">
                        {/* Logo as CSS mask so we can paint it any colour. The source SVG
                            embeds a PNG — normal CSS filters would render white rectangles. */}
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
                    </Link>

                    <div className="hidden md:flex items-center gap-1 text-[13px]">
                        {navLinks.map(([label, href]) => (
                            <a
                                key={href}
                                href={href}
                                onClick={() => track('nav_link_click', { label, href })}
                                className="px-3 py-1.5 rounded-md text-slate-400 hover:text-white transition-colors"
                            >
                                {label}
                            </a>
                        ))}
                        <div className="mx-3 h-4 w-px bg-white/10" />
                        <LanguageSwitcher variant="ghost" showLabel={false} className="text-slate-400 hover:text-white" />
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 text-[13px] font-normal h-8">
                                {t('nav.signIn')}
                            </Button>
                        </Link>
                        <Link
                            to="/register?plan=free"
                            onClick={() => track('cta_hero_click', { source: 'nav', destination: 'register_free' })}
                        >
                            <Button className="bg-white text-slate-900 hover:bg-slate-200 text-[13px] font-medium h-8 rounded-md ml-1 px-3.5">
                                {t('nav.startFree')}
                            </Button>
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="md:hidden p-2 -mr-2 text-white"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={t('nav.menu')}
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
                                onClick={() => setMobileOpen(false)}
                                className="block py-2.5 text-slate-300 text-sm"
                            >
                                {label}
                            </a>
                        ))}
                        <div className="pt-3 flex gap-2">
                            <Link to="/login" className="flex-1">
                                <Button variant="ghost" className="w-full text-slate-300">{t('nav.signIn')}</Button>
                            </Link>
                            <Link to="/register?plan=free" className="flex-1">
                                <Button className="w-full bg-white text-slate-900">{t('nav.startFree')}</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
