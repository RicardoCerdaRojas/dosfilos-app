/**
 * PlanGrid Component
 * 
 * Reusable grid layout for displaying multiple plans
 * Handles responsive layout (1 col mobile, 3 col desktop)
 */

import { PlanCard } from './PlanCard';
import type { LocalizedPlan } from '@dosfilos/domain';

interface PlanGridProps {
  plans: LocalizedPlan[];
  currentPlanId?: string;
  onPlanSelect: (planId: string) => void;
  loading?: boolean;
  className?: string;
}

export function PlanGrid({ 
  plans, 
  currentPlanId,
  onPlanSelect,
  loading = false,
  className = ''
}: PlanGridProps) {
  if (plans.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay planes disponibles en este momento
      </div>
    );
  }
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrentPlan={plan.id === currentPlanId}
          onSelect={onPlanSelect}
          loading={loading}
        />
      ))}
    </div>
  );
}
