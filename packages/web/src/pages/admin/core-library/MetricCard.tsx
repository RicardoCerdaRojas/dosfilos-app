import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subtitle?: string;
    /** When true, the card uses success-tone styling for emphasis. */
    highlight?: boolean;
}

/**
 * Compact metric card used across the Core Library admin tabs to surface
 * counts (resources, files, sync status, etc.). Uses semantic success token
 * for the highlight variant.
 */
export const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, subtitle, highlight }) => {
    return (
        <div
            className={cn(
                'rounded-lg border bg-card p-4 flex items-start gap-3',
                highlight && 'border-success/30 bg-success/5',
            )}
        >
            <div
                className={cn(
                    'h-10 w-10 rounded-md flex items-center justify-center shrink-0 bg-muted',
                    highlight && 'bg-success/15',
                )}
            >
                <Icon className={cn('h-5 w-5 text-muted-foreground', highlight && 'text-success')} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-xl font-bold leading-tight">{value}</div>
                {subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate" title={subtitle}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
};
