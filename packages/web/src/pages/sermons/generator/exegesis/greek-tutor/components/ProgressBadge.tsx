import React from 'react';
import { Trophy, Eye, Brain, Star } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface ProgressBadgeProps {
    masteryLevel: 0 | 1 | 2 | 3;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

/**
 * Badge component showing mastery level progress.
 * Follows SRP - only displays progress state visually.
 * Phase 3A: Visual indicator of learning progress.
 */
export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
    masteryLevel,
    size = 'md',
    showLabel = true
}) => {
    const { t } = useTranslation('greekTutor');
    
    const MASTERY_CONFIG = {
        0: { 
            label: t('quiz.masteryLevels.notSeen'), 
            icon: Eye, 
            color: 'text-gray-400', 
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            borderColor: 'border-gray-300 dark:border-gray-700'
        },
        1: { 
            label: t('quiz.masteryLevels.seen'), 
            icon: Eye, 
            color: 'text-blue-500', 
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            borderColor: 'border-blue-300 dark:border-blue-700'
        },
        2: { 
            label: t('quiz.masteryLevels.practiced'), 
            icon: Brain, 
            color: 'text-purple-500', 
            bgColor: 'bg-purple-100 dark:bg-purple-900/30',
            borderColor: 'border-purple-300 dark:border-purple-700'
        },
        3: { 
            label: t('quiz.masteryLevels.mastered'), 
            icon: Trophy, 
            color: 'text-amber-500', 
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
            borderColor: 'border-amber-300 dark:border-amber-700'
        }
    };
    const config = MASTERY_CONFIG[masteryLevel];
    const Icon = config.icon;
    
    const sizeClasses = {
        sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-1.5 py-0.5' },
        md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2 py-1' },
        lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' }
    };
    
    const sizes = sizeClasses[size];
    
    return (
        <div className={`
            inline-flex items-center gap-1.5 rounded-full border
            ${config.bgColor} ${config.borderColor} ${sizes.padding}
        `}>
            <Icon className={`${sizes.icon} ${config.color}`} />
            {showLabel && (
                <span className={`font-semibold ${config.color} ${sizes.text}`}>
                    {config.label}
                </span>
            )}
        </div>
    );
};
