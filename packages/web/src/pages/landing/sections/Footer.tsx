import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n';

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

const PRODUCT_HREFS = ['#filosofia', '#pilar-1', '#como-funciona', '/pricing', '#faq'];
const LEGAL_HREFS = ['/terms', '/privacy', '/dmca'];
const ACCOUNT_HREFS = ['/login', '/pricing'];

/** Zip translated labels with hard-coded routes/anchors into `[label, href]` tuples. */
function zipLinks(labels: string[], hrefs: string[]): Array<[string, string]> {
    return hrefs.map((href, i) => [labels[i] ?? '', href]);
}

/** Landing page footer — logo, three link columns, copyright, and tagline. */
export function Footer() {
    const { t } = useTranslation('landing');
    const productLinks = zipLinks(
        t('footer.productLinks', { returnObjects: true }) as string[],
        PRODUCT_HREFS,
    );
    const legalLinks = zipLinks(
        t('footer.legalLinks', { returnObjects: true }) as string[],
        LEGAL_HREFS,
    );
    const accountLinks = zipLinks(
        t('footer.accountLinks', { returnObjects: true }) as string[],
        ACCOUNT_HREFS,
    );
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
                            {t('footer.tagline')}
                        </p>
                    </div>
                    <FooterCol title={t('footer.productTitle')} links={productLinks} />
                    <FooterCol title={t('footer.legalTitle')} links={legalLinks} />
                    <FooterCol title={t('footer.accountTitle')} links={accountLinks} />
                </div>
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[12px]">
                    <div>© {new Date().getFullYear()} Preach.DosFilos. {t('footer.rightsReserved')}</div>
                    <div className="font-reading italic text-slate-500">
                        {t('footer.scriptureTagline')}
                    </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                    {t('footer.recaptchaPre')}{' '}
                    <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-slate-300 transition-colors"
                    >
                        {t('footer.recaptchaPrivacy')}
                    </a>{' '}
                    {t('footer.recaptchaMid')}{' '}
                    <a
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-slate-300 transition-colors"
                    >
                        {t('footer.recaptchaTerms')}
                    </a>{' '}
                    {t('footer.recaptchaPost')}
                </div>
            </div>
        </footer>
    );
}
