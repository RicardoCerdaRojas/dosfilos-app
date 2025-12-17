import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import { PlanMetadata } from '@dosfilos/domain';
import { getFeatureLabel } from '@/utils/featureLabels';

interface PlanCardProps {
  plan: PlanMetadata;
  isPopular?: boolean;
  ctaLabel: string;
  onCtaClick: () => void;
  ctaVariant?: 'default' | 'outline' | 'secondary';
  showCurrentBadge?: boolean;
}

/**
 * Reusable Plan Card Component
 * Follows Single Responsibility: Only renders plan UI
 */
export function PlanCard({
  plan,
  isPopular = false,
  ctaLabel,
  onCtaClick,
  ctaVariant = 'default',
  showCurrentBadge = false,
}: PlanCardProps) {
  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Zap className="h-3 w-3 mr-1" />
            Más Popular
          </Badge>
        </div>
      )}

      {showCurrentBadge && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-green-600 hover:bg-green-700">
            ✓ Actual
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.name}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">${plan.priceMonthly}</span>
          <span className="text-muted-foreground">/mes</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features List */}
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{getFeatureLabel(feature)}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          variant={ctaVariant}
          className="w-full"
          onClick={onCtaClick}
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
