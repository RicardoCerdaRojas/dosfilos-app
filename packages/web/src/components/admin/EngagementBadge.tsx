import { Badge } from '@/components/ui/badge';

interface EngagementBadgeProps {
    score: number; // 0-100
    showScore?: boolean;
}

export function EngagementBadge({ score, showScore = true }: EngagementBadgeProps) {
    // Determine level and styling based on score
    const getEngagementLevel = (score: number) => {
        if (score >= 66) {
            return {
                label: 'High',
                color: 'text-green-700',
                bg: 'bg-green-100',
                indicatorBg: 'bg-green-500'
            };
        } else if (score >= 33) {
            return {
                label: 'Medium',
                color: 'text-orange-700',
                bg: 'bg-orange-100',
                indicatorBg: 'bg-orange-500'
            };
        } else {
            return {
                label: 'Low',
                color: 'text-red-700',
                bg: 'bg-red-100',
                indicatorBg: 'bg-red-500'
            };
        }
    };

    const level = getEngagementLevel(score);

    return (
        <div className="flex items-center gap-2">
            <Badge 
                variant="outline"
                className={`${level.bg} ${level.color} border-transparent font-medium`}
            >
                <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${level.indicatorBg}`} />
                    {level.label}
                    {showScore && <span className="ml-1 text-xs">({score})</span>}
                </div>
            </Badge>
        </div>
    );
}
