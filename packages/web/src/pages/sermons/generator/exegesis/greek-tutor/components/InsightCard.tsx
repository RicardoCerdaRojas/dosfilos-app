import React from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export interface InsightCardProps {
    title?: string;
    children: React.ReactNode;
}

/**
 * Specialized card component for displaying key insights and summaries.
 * Used primarily in morphology breakdowns and theological significance sections.
 */
export const InsightCard: React.FC<InsightCardProps> = ({ 
    title = 'Resumen',
    children 
}) => {
    return (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wide">
                        {title}
                    </h4>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none
                                prose-p:text-foreground/90 prose-p:leading-relaxed
                                prose-strong:text-foreground prose-strong:font-semibold">
                    {children}
                </div>
            </div>
        </Card>
    );
};
