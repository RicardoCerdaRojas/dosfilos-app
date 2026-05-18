import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Optional eyebrow text above the title (e.g., plan name, step indicator) */
  eyebrow?: string;
}

/**
 * Auth layout — monochromatic, landing-aligned.
 * Left: dark slate panel with logo, headline, philosophy quote.
 * Right: clean white panel with title, form content, language switcher.
 */
export function AuthLayout({ children, title, subtitle, eyebrow }: AuthLayoutProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="min-h-screen flex bg-white text-slate-900 antialiased" style={{ colorScheme: 'light' }}>
      {/* LEFT — dark editorial panel */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[40%] bg-slate-950 text-white relative flex-col justify-between p-12 xl:p-16">
        {/* Subtle radial accent */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.25) 0%, transparent 60%)',
          }}
        />

        {/* Top: logo */}
        <Link to="/" className="relative z-10 inline-flex items-center group" aria-label="Preach DosFilos">
          <span
            className="block h-12 w-[144px] bg-white transition-transform group-hover:scale-[1.02]"
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
        </Link>

        {/* Middle: philosophy */}
        <div className="relative z-10 max-w-md space-y-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-medium">
            {t('layout.eyebrow', { defaultValue: 'Gestión del conocimiento pastoral' })}
          </p>
          <h1 className="font-reading text-4xl xl:text-5xl leading-[1.1] tracking-tight text-white">
            {t('layout.tagline')}
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-400">
            {t('layout.subtitle')}
          </p>
        </div>

        {/* Bottom: scripture anchor */}
        <div className="relative z-10 max-w-md pt-8 border-t border-white/5">
          <blockquote className="font-reading text-lg italic leading-relaxed text-slate-300">
            "{t('layout.quote')}"
          </blockquote>
          <cite className="not-italic block mt-4 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-medium">
            {t('layout.quoteAuthor')}
          </cite>
        </div>
      </aside>

      {/* RIGHT — form panel */}
      <main className="flex-1 flex flex-col relative">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 lg:px-10 py-6">
          <Link to="/" className="lg:hidden inline-flex items-center" aria-label="Preach DosFilos">
            <span
              className="block h-9 w-[108px] bg-slate-900"
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
          </Link>
          <div className="ml-auto">
            <LanguageSwitcher variant="ghost" showLabel={false} />
          </div>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10 pb-4">
          <div className={cn('w-full max-w-[400px] space-y-8')}>
            <div className="space-y-2">
              {eyebrow && (
                <p className="text-[11px] tracking-[0.2em] uppercase text-indigo-600 font-medium">
                  {eyebrow}
                </p>
              )}
              <h2 className="font-reading text-3xl leading-tight tracking-tight text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[15px] leading-relaxed text-slate-500">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>

        {/* reCAPTCHA legal notice — covers all auth pages with one line. */}
        <p className="px-6 lg:px-10 pb-6 text-center text-[10.5px] leading-relaxed text-slate-400">
          {t('layout.recaptchaNotice.prefix')}{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            {t('layout.recaptchaNotice.privacy')}
          </a>{' '}
          {t('layout.recaptchaNotice.and')}{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            {t('layout.recaptchaNotice.terms')}
          </a>{' '}
          {t('layout.recaptchaNotice.suffix')}
        </p>
      </main>
    </div>
  );
}
