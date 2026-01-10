/**
 * PlanCard Component
 * 
 * Reusable card component for displaying a subscription plan
 * Displays: name, price, features, highlightText badge, current plan badge
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import type { LocalizedPlan } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

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
        {/* Modules Section (NEW) */}
        {plan.localizedModules && plan.localizedModules.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              {t('modulesIncluded', { defaultValue: 'Módulos Incluidos' })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.localizedModules.map((module) => (
                <Badge key={module.id} variant="secondary" className="text-xs">
                  {module.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Features List - HIDDEN as per user request */}
        {/* 
        <div className="space-y-3 mb-4">
          {plan.localizedFeatures.map((feature) => (
            <div key={feature.id} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature.label}</span>
            </div>
          ))}
        </div>
        */}
        
        {/* Limits Section (REFACTORED - using translations) */}
        {plan.localizedLimits && plan.localizedLimits.length > 0 && (
          <div className="border-t pt-4 mb-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t('limits', { defaultValue: 'Límites' })}
            </p>
            
            {plan.localizedLimits.map((limit) => {
              // Skip unlimited items (value 999) or zero values
              if (limit.value === 999 || limit.value === 0) return null;
              
              // Icon mapping
              const icons: Record<string, string> = {
                sermonsPerMonth: '📝',
                libraryStorageMB: '💾',
                greekSessionsPerMonth: '🏛️',
                maxPreachingPlans: '📅',
                maxPreachingPlansPerMonth: '📅',
                maxMembers: '👥'
              };
              
              return (
                <div key={limit.key} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {icons[limit.key] || '•'}
                  </span>
                  <span>{limit.label}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* CTA Button */}
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : 'default'}
          disabled={loading || isCurrentPlan}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrentPlan ? 'Plan Actual' : 'Seleccionar'}
        </Button>
      </CardContent>
    </Card>
  );
}
