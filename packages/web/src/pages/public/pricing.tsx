import { useNavigate } from 'react-router-dom';
import { getPublicPlans, isPaidPlan } from '@dosfilos/domain';
import { PlanCard } from '@/components/subscription/PlanCard';

/**
 * Public Pricing Page
 * Accessible without authentication
 * Responsibility: Display plans and route to registration
 */
export function PricingPage() {
  const navigate = useNavigate();
  const plans = getPublicPlans();

  const handlePlanSelect = (planId: string) => {
    // Navigate to registration with plan parameter
    navigate(`/register?plan=${planId}`);
  };

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
          {plans.map((plan) => {
            const isPopular = plan.id === 'starter';
            const isPaid = isPaidPlan(plan.id);

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
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
