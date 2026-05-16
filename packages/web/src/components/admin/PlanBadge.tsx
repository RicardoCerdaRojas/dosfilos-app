import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';

interface PlanBadgeProps {
    planId: string;
}

/**
 * Each plan resolves to a semantic token (so the badge follows the active
 * color theme + dark mode) plus an i18n label keyed by plan id. Hardcoded
 * English labels + slate/blue/purple-100 literals used to cause mismatches
 * with the filter dropdown ("Free" badge vs "Personal"/"Equipo" filter).
 */
const planTone: Record<string, string> = {
    free: 'bg-muted text-muted-foreground border-border',
    basic: 'bg-info-subtle text-info-subtle-foreground border-info/30',
    pro: 'bg-primary/10 text-primary border-primary/30',
    team: 'bg-warning-subtle text-warning-subtle-foreground border-warning/30',
    enterprise: 'bg-warning-subtle text-warning-subtle-foreground border-warning/30',
};

export function PlanBadge({ planId }: PlanBadgeProps) {
    const { t } = useTranslation('admin');
    const tone = planTone[planId] ?? planTone.free;
    const label = t(`users.planLabels.${planId}`);

    return (
        <Badge variant="outline" className={`${tone} font-medium`}>
            {label}
        </Badge>
    );
}
