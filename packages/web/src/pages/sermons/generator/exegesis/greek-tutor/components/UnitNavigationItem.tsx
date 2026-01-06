import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { TrainingUnit } from '@dosfilos/domain';

export interface UnitNavigationItemProps {
    unit: TrainingUnit;
    index: number;
    isActive: boolean;
    isCompleted: boolean;
    onClick: () => void;
}

/**
 * Navigation item for individual training unit.
 * Follows Single Responsibility - only renders unit list item.
 */
export const UnitNavigationItem: React.FC<UnitNavigationItemProps> = ({
    unit,
    index,
    isActive,
    isCompleted,
    onClick
}) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 p-3 rounded-lg
                transition-all duration-200 text-left
                ${isActive 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-accent border border-transparent'
                }
            `}
        >
            {/* Status icon */}
            <div className="flex-shrink-0">
                {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                    <Circle className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
            </div>

            {/* Unit info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{index + 1}
                    </span>
                    <span className={`font-serif text-base truncate ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>
                        {unit.greekForm.text}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                    {unit.greekForm.gloss}
                </p>
            </div>
        </button>
    );
};
