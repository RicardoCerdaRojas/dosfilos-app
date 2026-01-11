import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { usePlans, getPlanPriceId } from '@/hooks/usePlans';
import { PlanGrid } from '@/components/plans';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher';

/**
 * Welcome page - Post registration plan selection
 * Loads plans from Firestore via usePlans hook
 * Responsive design: Stack on mobile, grid on desktop
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const { plans, loading } = usePlans();
  
  // Filter out legacy plans (Free plan should not be shown to new users)
  const availablePlans = plans.filter(plan => !plan.isLegacy);

  const handlePlanSelect = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
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

        {/* Plan Grid */}
        <PlanGrid
          plans={availablePlans}
          onPlanSelect={handlePlanSelect}
          loading={isLoading}
        />

        {/* Discrete Free Option */}
        <div className="text-center border-t pt-6 mt-8">
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
