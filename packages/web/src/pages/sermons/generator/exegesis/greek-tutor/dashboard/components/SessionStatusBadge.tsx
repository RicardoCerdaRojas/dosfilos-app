import React from 'react';
import { cn } from '@/lib/utils';

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

interface SessionStatusBadgeProps {
    status: SessionStatus;
    className?: string;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; className: string }> = {
    ACTIVE: {
        label: 'Activo',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    COMPLETED: {
        label: 'Completado',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    ABANDONED: {
        label: 'Abandonado',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400'
    }
};

/**
 * Badge component to display session status with appropriate styling
 */
export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status, className }) => {
    const config = STATUS_CONFIG[status];

    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            config.className,
            className
        )}>
            {config.label}
        </span>
    );
};
