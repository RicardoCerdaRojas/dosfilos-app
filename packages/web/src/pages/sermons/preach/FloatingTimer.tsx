import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FloatingTimerProps {
    timeLeft: number;
    onShowControls: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Floating timer pill shown when running and the top toolbar is hidden.
 * Pill background reflects three urgency levels via semantic tokens.
 */
export const FloatingTimer: React.FC<FloatingTimerProps> = ({ timeLeft, onShowControls }) => {
    const { t } = useTranslation('sermonDetail');
    const isCritical = timeLeft <= 5 * 60;
    const isWarning = !isCritical && timeLeft <= 10 * 60;

    return (
        <div
            className={cn(
                'fixed bottom-8 right-8 z-50 px-6 py-3 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300',
                isCritical && 'bg-destructive/90 text-destructive-foreground animate-pulse',
                isWarning && 'bg-warning/90 text-warning-foreground',
                !isCritical && !isWarning && 'bg-background/90 border',
            )}
            onClick={(e) => {
                e.stopPropagation();
                onShowControls();
            }}
        >
            <div className="flex items-center gap-3">
                <Clock
                    className={cn(
                        'h-5 w-5',
                        (isCritical || isWarning) ? 'text-current' : 'text-muted-foreground',
                    )}
                />
                <span
                    className={cn(
                        'font-mono text-2xl font-bold tabular-nums',
                        (isCritical || isWarning) ? 'text-current' : 'text-foreground',
                    )}
                >
                    {formatTime(timeLeft)}
                </span>
                {isCritical && (
                    <span className="text-xs font-medium opacity-80">{t('preachMode.timeUp')}</span>
                )}
            </div>
        </div>
    );
};
