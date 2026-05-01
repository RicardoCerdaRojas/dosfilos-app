/**
 * PlanCard Component
 * 
 * Reusable card component for displaying a subscription plan
 * Displays: name, price, features, highlightText badge, current plan badge
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Wand2, Sparkles } from 'lucide-react';
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
        {/* Monthly processing quota — surfaces the new billing model
            (plan-included pages + optional credit packs) where it
            matters: at the buy decision. Only shown when the plan
            actually includes processing (Free shows 0/0 and we hide
            the block entirely to avoid telegraphing "this plan can't
            do anything"). */}
        <ProcessingQuotaBlock plan={plan} />

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

/**
 * Renders the monthly processing quota included in the plan. Reads
 * `plan.limits.{standardPagesPerMonth, premiumPagesPerMonth}` populated
 * by the plan-quotas migration. When the plan has zero processing
 * (Free tier), the whole block is hidden — Free users have other
 * affordances and we don't want a "0 pages/mes" line shouting
 * uselessness in their face.
 *
 * Below the quota we show a soft note about credit packs as the
 * escape valve so the user understands the model: included quota +
 * optional prepaid extras. This is the storytelling that prevents
 * "I paid Pro but ran out of pages and the app made me buy more"
 * complaints — the upfront expectation is set right at purchase time.
 */
function ProcessingQuotaBlock({ plan }: { plan: LocalizedPlan }) {
  const standard = Number(plan.limits?.standardPagesPerMonth ?? 0);
  const premium = Number(plan.limits?.premiumPagesPerMonth ?? 0);
  if (standard === 0 && premium === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 mb-2">
        Incluye cada mes
      </p>
      <div className="grid grid-cols-2 gap-2">
        <QuotaRow icon={Wand2} value={standard} label="estándar" />
        <QuotaRow icon={Sparkles} value={premium} label="premium" />
      </div>
      <p className="text-[10.5px] text-muted-foreground mt-2 leading-snug">
        ¿Necesitas más? Compra packs prepago desde $3.
      </p>
    </div>
  );
}

function QuotaRow({ icon: Icon, value, label }: { icon: typeof Wand2; value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <Icon className="h-3 w-3 text-primary self-center shrink-0" />
      <span className="text-base font-bold tabular-nums text-foreground">
        {value.toLocaleString()}
      </span>
      <span className="text-[11px] text-muted-foreground">págs. {label}</span>
    </div>
  );
}
