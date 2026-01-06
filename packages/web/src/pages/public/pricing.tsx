import { useNavigate } from 'react-router-dom';
import { PlanCard } from '@/components/subscription/PlanCard';
import { usePlans, getPlanPriceId } from '@/hooks/usePlans';

/**
 * Public Pricing Page
 * Loads plans from Firestore (single source of truth)
 * Responsibility: Display plans and route to registration
 */
export function PricingPage() {
  const navigate = useNavigate();
  const { plans, loading } = usePlans();

  const handlePlanSelect = (planId: string) => {
    navigate(`/register?plan=${planId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando planes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Elige el Plan Perfecto para Tu Ministerio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Potencia tu predicación con herramientas impulsadas por IA. 
            Comienza gratis, actualiza cuando necesites más.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans
            .filter(p => p.isPublic)
            .map((plan) => {
              const isPopular = plan.highlightText === 'Más Popular';
              const isPaid = plan.id !== 'free';

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
                  isPopular={isPopular}
                  ctaLabel={isPaid ? 'Suscribirse' : 'Empezar Gratis'}
                  onCtaClick={() => handlePlanSelect(plan.id)}
                  ctaVariant={isPaid ? 'default' : 'outline'}
                />
              );
            })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Todos los planes incluyen 14 días de prueba gratis. Cancela en cualquier momento.</p>
        </div>
      </div>
    </div>
  );
}
