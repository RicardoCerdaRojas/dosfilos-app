/**
 * Approach Card Component
 * 
 * Displays a single homiletical approach option in a visually appealing card
 * @layer Presentation - Pure UI component
 */

import { HomileticalApproach } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target, Users, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApproachCardProps {
    approach: HomileticalApproach;
    isSelected: boolean;
    onSelect: () => void;
}

export function ApproachCard({ approach, isSelected, onSelect }: ApproachCardProps) {
    // Map types to colors
    const typeColors: Record<string, string> = {
        pastoral: 'bg-blue-100 text-blue-800',
        'teológico': 'bg-purple-100 text-purple-800',
        'apologético': 'bg-red-100 text-red-800',
        'evangelístico': 'bg-green-100 text-green-800',
        expositivo: 'bg-amber-100 text-amber-800',
        narrativo: 'bg-pink-100 text-pink-800',
    };

    // Check if this is an expository approach (user's primary approach)
    const isExpository = approach.type === 'expositivo';

    return (
        <Card 
            className={cn(
                "p-6 cursor-pointer transition-all hover:shadow-lg",
                isSelected && "ring-2 ring-primary shadow-md",
                isExpository && "border-2 border-amber-300" // Subtle accent for expository
            )}
            onClick={onSelect}
        >
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={cn(typeColors[approach.type] || 'bg-gray-100 text-gray-800')}>
                                {approach.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {approach.tone}
                            </Badge>
                            {isExpository && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Recomendado para ti
                                </Badge>
                            )}
                        </div>
                        <h4 className="font-semibold text-lg leading-tight">
                            {approach.direction}
                        </h4>
                    </div>
                    {isSelected && (
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                </div>

                {/* Purpose */}
                <div className="flex gap-2">
                    <Target className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        {approach.purpose}
                    </p>
                </div>

                {/* Target Audience */}
                <div className="flex gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Para:</span> {approach.targetAudience}
                    </p>
                </div>

                {/* Structure Preview */}
                {approach.suggestedStructure && (
                    <div className="flex gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground italic">
                            {approach.suggestedStructure}
                        </p>
                    </div>
                )}

                {/* Rationale */}
                <div className="pt-3 border-t">
                    <p className="text-xs italic text-muted-foreground">
                        💡 <span className="font-medium">Por qué funciona:</span> {approach.rationale}
                    </p>
                </div>

                {/* Applications Preview */}
                {approach.contemporaryApplication && approach.contemporaryApplication.length > 0 && (
                    <div className="pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Aplicaciones:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                            {approach.contemporaryApplication.slice(0, 2).map((app, i) => (
                                <li key={i} className="flex gap-1">
                                    <span>•</span>
                                    <span className="line-clamp-1">{app}</span>
                                </li>
                            ))}
                            {approach.contemporaryApplication.length > 2 && (
                                <li className="text-xs text-muted-foreground/60">
                                    +{approach.contemporaryApplication.length - 2} más...
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </Card>
    );
}
