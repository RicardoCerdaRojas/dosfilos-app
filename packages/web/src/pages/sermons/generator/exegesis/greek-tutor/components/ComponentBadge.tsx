import React from 'react';
import { 
    ChevronRight, 
    GitBranch, 
    Wrench, 
    Target, 
    MoreHorizontal,
    LucideIcon 
} from 'lucide-react';

export type ComponentType = 'prefix' | 'root' | 'formative' | 'ending' | 'other';

export interface ComponentBadgeProps {
    type: ComponentType;
    label: string;
}

const TYPE_CONFIG: Record<ComponentType, { icon: LucideIcon; label: string; colorClass: string }> = {
    prefix: {
        icon: ChevronRight,
        label: 'Prefijo',
        colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    root: {
        icon: GitBranch,
        label: 'Raíz',
        colorClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    },
    formative: {
        icon: Wrench,
        label: 'Formativo',
        colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    },
    ending: {
        icon: Target,
        label: 'Terminación',
        colorClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    other: {
        icon: MoreHorizontal,
        label: 'Otro',
        colorClass: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
    }
};

/**
 * Badge component for morphological component types.
 * Replaces emoji-based type indicators with icon-based badges.
 */
export const ComponentBadge: React.FC<ComponentBadgeProps> = ({ type, label }) => {
    const config = TYPE_CONFIG[type];
    const Icon = config.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.colorClass} text-xs font-semibold`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{label || config.label}</span>
        </div>
    );
};
