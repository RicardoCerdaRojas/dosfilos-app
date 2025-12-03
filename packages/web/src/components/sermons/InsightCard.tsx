import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
    insights: string[];
}

export function InsightCard({ insights }: InsightCardProps) {
    return (
        <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Lightbulb className="h-5 w-5" />
                Consideraciones Pastorales
            </h3>
            <ul className="space-y-3">
                {insights.map((insight, index) => (
                    <li key={index} className="flex gap-3">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0">
                            {index + 1}.
                        </span>
                        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                            {insight}
                        </p>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
