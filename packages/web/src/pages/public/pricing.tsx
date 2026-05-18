import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PlanCard } from '@/components/subscription/PlanCard';
import { FreeTierBanner } from '@/components/subscription/FreeTierBanner';
import { usePlans, getPlanPriceId } from '@/hooks/usePlans';
import { LanguageSwitcher } from '@/i18n';

/**
 * Public pricing page — decision surface.
 * Positioning lives on the landing; here we show prices above the fold and let
 * the user choose. Header → compact hero → plans → minimal legal footer.
 */
export function PricingPage() {
  const navigate = useNavigate();
  const { plans, loading } = usePlans();

  const handlePlanSelect = (planId: string) => {
    navigate(`/register?plan=${planId}`);
  };

  return (
    <div
      className="bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 antialiased min-h-screen flex flex-col"
      style={{ colorScheme: 'light' }}
    >
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center group" aria-label="Preach DosFilos">
            <span
              className="block h-14 w-[168px] bg-slate-900 transition-transform group-hover:scale-[1.02]"
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
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              variant="ghost"
              showLabel={false}
              className="text-slate-500 hover:text-slate-900"
            />
            <Link
              to="/login"
              className="text-[13px] text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 lg:px-10 py-6 md:py-8">
        <div className="max-w-[1100px] mx-auto">
          {/* Compact hero — eyebrow + title in tight stack */}
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-3">
              <span>Precios</span>
              <span className="text-slate-300 normal-case tracking-normal">·</span>
              <span className="text-slate-500 normal-case tracking-normal">
                Plan gratis · 30 días en pagados · sin compromiso
              </span>
            </div>
            <h1 className="font-reading text-[26px] md:text-[34px] leading-[1.05] tracking-[-0.02em] text-slate-900">
              Elige tu plan.
            </h1>
          </div>

          {/* Paid plans grid — Free is promoted to a standalone CTA below */}
          {loading ? (
            <div className="text-center text-slate-500 py-12">Cargando planes…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans
                  .filter((p) => p.isPublic && p.pricing.monthly > 0)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((plan) => {
                    const isPopular = plan.highlightText === 'Más Popular';
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={{
                          id: plan.id,
                          name: plan.name,
                          description: plan.description,
                          priceMonthly: plan.pricing.monthly,
                          stripePriceId: getPlanPriceId(plan),
                          features: plan.features,
                          sortOrder: plan.sortOrder,
                          isPublic: plan.isPublic,
                        }}
                        standardPagesPerMonth={plan.limits?.standardPagesPerMonth}
                        premiumPagesPerMonth={plan.limits?.premiumPagesPerMonth}
                        exegesisUsdPerMonth={plan.limits?.exegesisUsdPerMonth}
                        isPopular={isPopular}
                        ctaLabel="Empezar 30 días gratis"
                        onCtaClick={() => handlePlanSelect(plan.id)}
                      />
                    );
                  })}
              </div>

              <FreeTierBanner onCtaClick={() => handlePlanSelect('free')} />
            </>
          )}

        </div>
      </main>

      {/* Footer — merges fine print + back link + copyright into one compact row */}
      <footer className="border-t border-slate-200 px-6 lg:px-10 py-3">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[12px] text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-indigo-700 font-medium">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
          <p className="text-center md:text-right leading-relaxed">
            Sin cargos los primeros 30 días · Cancela cuando quieras ·{' '}
            <a href="/terms" className="underline hover:text-slate-900">Términos</a> ·{' '}
            <a href="/privacy" className="underline hover:text-slate-900">Privacidad</a>
          </p>
        </div>
        <p className="max-w-[1100px] mx-auto mt-2 text-center md:text-right text-[10.5px] text-slate-400 leading-relaxed">
          Este sitio está protegido por reCAPTCHA y aplican la{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700 transition-colors"
          >
            Política de privacidad
          </a>{' '}
          y los{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700 transition-colors"
          >
            Términos de servicio
          </a>{' '}
          de Google.
        </p>
      </footer>
    </div>
  );
}
