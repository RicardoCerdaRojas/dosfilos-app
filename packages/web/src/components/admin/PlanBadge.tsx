import { Badge } from '@/components/ui/badge';

interface PlanBadgeProps {
    planId: string;
}

const planStyles: Record<string, { label: string; color: string; bg: string }> = {
    free: {
        label: 'Free',
        color: 'text-slate-700',
        bg: 'bg-slate-100'
    },
    pro: {
        label: 'Pro',
        color: 'text-blue-700',
        bg: 'bg-blue-100'
    },
    team: {
        label: 'Team',
        color: 'text-purple-700',
        bg: 'bg-purple-100'
    }
};

export function PlanBadge({ planId }: PlanBadgeProps) {
    const style = planStyles[planId] || planStyles.free;

    return (
        <Badge 
            variant="outline"
            className={`${style.bg} ${style.color} border-transparent font-medium`}
        >
            {style.label}
        </Badge>
    );
}
