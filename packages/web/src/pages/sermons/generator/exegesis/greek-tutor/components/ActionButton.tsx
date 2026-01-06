import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

export interface ActionButtonProps {
    icon: LucideIcon;
    label: string;
    description?: string;
    onClick: () => void;
    isActive?: boolean;
    isLoading?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
}

/**
 * Reusable action button component for Greek Tutor interaction panel.
 * Follows Single Responsibility Principle - only handles action button rendering.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
    icon: Icon,
    label,
    description,
    onClick,
    isActive = false,
    isLoading = false,
    variant = 'outline'
}) => {
    return (
        <Button
            variant={variant}
            onClick={onClick}
            disabled={isLoading}
            className={`
                w-full justify-start gap-3 h-auto py-3 px-4 
                transition-all duration-200
                ${isActive 
                    ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/15' 
                    : 'hover:bg-accent'
                }
            `}
        >
            <div className={`
                flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                ${isActive 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }
            `}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
                <div className="font-medium text-sm">{label}</div>
                {description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                        {description}
                    </div>
                )}
            </div>
        </Button>
    );
};
