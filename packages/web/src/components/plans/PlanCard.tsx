/**
 * PlanCard Component
 * 
 * Reusable card component for displaying a subscription plan
 * Displays: name, price, features, highlightText badge, current plan badge
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import type { LocalizedPlan } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { getFeatureLabel } from '@/utils/featureLabels';

interface PlanCardProps {
  plan: LocalizedPlan;
  isCurrentPlan?: boolean;
  onSelect: (planId: string) => void;
  loading?: boolean;
  className?: string;
}

export function PlanCard({ 
  plan, 
  isCurrentPlan = false,
  onSelect,
  loading = false,
  className = ''
}: PlanCardProps) {
  const hasHighlight = !!plan.highlightText;
  const { t } = useTranslation('common');
  
  return (
    <Card 
      className={`relative ${hasHighlight ? 'border-primary shadow-lg' : ''} ${className}`}
    >
      {/* Highlight Badge (e.g., "Más Popular") */}
      {hasHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Zap className="h-3 w-3 mr-1" />
            {plan.highlightText}
          </Badge>
        </div>
      )}
      
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-green-600 hover:bg-green-700">
            Plan Actual
          </Badge>
        </div>
      )}
      
      <CardHeader>
        {/* 30-Day Trial Badge */}
        {plan.pricing.monthly > 0 && (
          <Badge variant="secondary" className="mb-3 w-fit bg-primary/10 text-primary hover:bg-primary/20">
            🎁 30 días gratis, luego ${plan.pricing.monthly}/mes
          </Badge>
        )}
        
        <CardTitle>{plan.localizedName}</CardTitle>
        <CardDescription>{plan.localizedDescription}</CardDescription>
        
        {/* Price */}
        <div className="mt-4">
          <span className="text-4xl font-bold">
            {plan.pricing.currency === 'USD' ? '$' : plan.pricing.currency}
            {plan.pricing.monthly}
          </span>
          <span className="text-muted-foreground">/mes</span>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Feature list — uses our static featureLabels map (same source as
            public PlanCard) so labels stay consistent and don't depend on
            plan_translations being fully seeded. Modules are intentionally
            not rendered here: they're identical across paid plans and
            duplicate the feature list. */}
        {plan.features && plan.features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {plan.features.map((featureId) => (
              <li key={featureId} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-[3px] flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3.5} />
                </span>
                <span className="text-[13.5px] text-foreground/80 leading-snug">
                  {getFeatureLabel(featureId)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : 'default'}
          disabled={loading || isCurrentPlan}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrentPlan ? t('currentPlan', { defaultValue: 'Plan Actual' }) : t('select', { defaultValue: 'Seleccionar' })}
        </Button>
      </CardContent>
    </Card>
  );
}
