import { Link } from 'react-router-dom';

interface FooterColProps {
    title: string;
    /** Each link is a `[label, href]` tuple. */
    links: Array<[string, string]>;
}

function FooterCol({ title, links }: FooterColProps) {
    return (
        <div className="md:col-span-2 md:col-start-auto">
            <h4 className="text-white font-semibold text-[11px] uppercase tracking-[0.2em] mb-4">{title}</h4>
            <ul className="space-y-2.5 text-[13px]">
                {links.map(([label, href]) => {
                    const isAnchor = href.startsWith('#') || href.startsWith('http');
                    return (
                        <li key={href}>
                            {isAnchor ? (
                                <a href={href} className="text-slate-400 hover:text-white transition-colors">{label}</a>
                            ) : (
                                <Link to={href} className="text-slate-400 hover:text-white transition-colors">{label}</Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

const PRODUCT_LINKS: Array<[string, string]> = [
    ['Filosofía', '#filosofia'],
    ['Pilares', '#pilar-1'],
    ['Cómo funciona', '#como-funciona'],
    ['Precios', '/pricing'],
    ['FAQ', '#faq'],
];

const LEGAL_LINKS: Array<[string, string]> = [
    ['Términos de uso', '/terms'],
    ['Privacidad', '/privacy'],
    ['Política DMCA', '/dmca'],
];

const ACCOUNT_LINKS: Array<[string, string]> = [
    ['Iniciar sesión', '/login'],
    ['Registrarse', '/pricing'],
];

/** Landing page footer — logo, three link columns, copyright, and tagline. */
export function Footer() {
    return (
        <footer className="bg-slate-950 text-slate-400 border-t border-white/5 py-14 px-6 lg:px-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="grid md:grid-cols-12 gap-10 mb-12">
                    <div className="md:col-span-5">
                        <span
                            role="img"
                            aria-label="Preach DosFilos"
                            className="block h-12 w-[144px] bg-white mb-5"
                            style={{
                                WebkitMaskImage: 'url(/logo_dfp.png)',
                                maskImage: 'url(/logo_dfp.png)',
                                WebkitMaskSize: 'contain',
                                maskSize: 'contain',
                                WebkitMaskPosition: 'left center',
                                maskPosition: 'left center',
                                WebkitMaskRepeat: 'no-repeat',
                                maskRepeat: 'no-repeat',
                            }}
                        />
                        <p className="text-[13.5px] leading-relaxed max-w-sm text-slate-400">
                            Sistema de gestión del conocimiento para el ministerio pastoral.
                            Estudio profundo. Exposición fiel. Aplicación clara.
                        </p>
                    </div>
                    <FooterCol title="Producto" links={PRODUCT_LINKS} />
                    <FooterCol title="Legal" links={LEGAL_LINKS} />
                    <FooterCol title="Cuenta" links={ACCOUNT_LINKS} />
                </div>
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[12px]">
                    <div>© {new Date().getFullYear()} Preach.DosFilos. Todos los derechos reservados.</div>
                    <div className="font-reading italic text-slate-500">
                        "Enteramente preparados para toda buena obra" · 2 Timoteo 3:17
                    </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                    Este sitio está protegido por reCAPTCHA y aplican la{' '}
                    <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-slate-300 transition-colors"
                    >
                        Política de privacidad
                    </a>{' '}
                    y los{' '}
                    <a
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-slate-300 transition-colors"
                    >
                        Términos de servicio
                    </a>{' '}
                    de Google.
                </div>
            </div>
        </footer>
    );
}
