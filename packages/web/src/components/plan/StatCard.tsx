import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  percentage?: number;
  variant?: 'default' | 'warning' | 'success' | 'info';
  urgency?: string;
}

const variantStyles = {
  default: {
    card: 'border-slate-200',
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
  },
  warning: {
    card: 'border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-900',
  },
  success: {
    card: 'border-green-200',
    icon: 'bg-green-100 text-green-600',
    value: 'text-green-900',
  },
  info: {
    card: 'border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-900',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  percentage,
  variant = 'default',
  urgency,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('p-6 hover:shadow-md transition-shadow', styles.card)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </p>
          <div className="space-y-1">
            <p className={cn('text-3xl font-bold', styles.value)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
            {urgency && (
              <p className={cn(
                'text-xs font-medium',
                variant === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                {urgency}
              </p>
            )}
            {trend && (
              <p className="text-xs text-green-600 font-medium">
                {trend}
              </p>
            )}
          </div>
        </div>
        <div className={cn(
          'rounded-full p-3',
          styles.icon
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {percentage !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                variant === 'success' ? 'bg-green-500' :
                variant === 'warning' ? 'bg-amber-500' :
                variant === 'info' ? 'bg-blue-500' :
                'bg-slate-500'
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {percentage}% completado
          </p>
        </div>
      )}
    </Card>
  );
}
