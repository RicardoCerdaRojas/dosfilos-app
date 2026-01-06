import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, PartyPopper } from 'lucide-react';
import { usePlans, getPlanPriceId } from '@/hooks/usePlans';
import { getFeatureLabel } from '@/utils/featureLabels';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher';

/**
 * Welcome page - Post registration plan selection
 * Loads plans from Firestore
 * Responsive design: Stack on mobile, grid on desktop
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const { plans, loading } = usePlans();

  // Only show paid plans (exclude free)
  const paidPlans = plans.filter(p => p.id !== 'free' && p.isPublic);

  const handlePlanSelect = async (planId: string) => {
    const plan = paidPlans.find(p => p.id === planId);
    if (!plan) return;

    const priceId = getPlanPriceId(plan);
    if (!priceId) {
      toast.error(t('errors.planNotAvailable'));
      return;
    }

    setIsLoading(true);
    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/dashboard?welcome=true`,
        cancelUrl: `${window.location.origin}/welcome`,
      });

      const { url } = result.data as { url: string };
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(t('errors.checkoutFailed'));
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="ghost" showLabel={false} />
      </div>
      
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <PartyPopper className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {t('header.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Plans Grid - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {paidPlans.map((plan) => {
            const isPopular = plan.highlightText === 'Más Popular';

            return (
              <Card
                key={plan.id}
                className={`relative ${isPopular ? 'border-primary shadow-lg md:scale-105' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    {t('plans.mostPopular')}
                  </div>
                )}

                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${plan.pricing.monthly}</span>
                    <span className="text-muted-foreground text-sm">{t('plans.perMonth')}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Top 4 Features */}
                  <ul className="space-y-2">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{getFeatureLabel(feature)}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-muted-foreground">
                        +{plan.features.length - 4} {t('plans.moreFeatures')}
                      </li>
                    )}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? t('plans.subscribing') : t('plans.subscribe')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Discrete Free Option */}
        <div className="text-center border-t pt-6">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            disabled={isLoading}
          >
            {t('freePlan.continueButton')}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            {t('freePlan.changeAnytime')}
          </p>
        </div>
      </div>
    </div>
  );
}
