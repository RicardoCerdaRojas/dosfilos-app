import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };
    icon?: ReactNode;
    colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

const colorSchemes = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        iconBg: 'bg-blue-100',
        trendUp: 'text-green-600',
        trendDown: 'text-red-600'
    },
    green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        iconBg: 'bg-green-100',
        trendUp: 'text-green-600',
        trendDown: 'text-red-600'
    },
    red: {
        bg: 'bg-red-50',
        icon: 'text-red-600',
        iconBg: 'bg-red-100',
        trendUp: 'text-green-600',
        trendDown: 'text-red-600'
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        iconBg: 'bg-purple-100',
        trendUp: 'text-green-600',
        trendDown: 'text-red-600'
    },
    orange: {
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        iconBg: 'bg-orange-100',
        trendUp: 'text-green-600',
        trendDown: 'text-red-600'
    }
};

export function MetricCard({
    title,
    value,
    subtitle,
    trend,
    icon,
    colorScheme = 'blue'
}: MetricCardProps) {
    const colors = colorSchemes[colorScheme];

    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">{value}</h3>
                    
                    {subtitle && (
                        <p className="text-sm text-slate-500">{subtitle}</p>
                    )}

                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend.direction === 'up' ? (
                                <TrendingUp className={`h-4 w-4 ${colors.trendUp}`} />
                            ) : (
                                <TrendingDown className={`h-4 w-4 ${colors.trendDown}`} />
                            )}
                            <span className={`text-sm font-medium ${
                                trend.direction === 'up' ? colors.trendUp : colors.trendDown
                            }`}>
                                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
                            </span>
                            <span className="text-sm text-slate-500 ml-1">vs yesterday</span>
                        </div>
                    )}
                </div>

                {icon && (
                    <div className={`p-3 rounded-full ${colors.iconBg}`}>
                        <div className={colors.icon}>
                            {icon}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
