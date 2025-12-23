import React from 'react';
import { Eye, FileText, Heart } from 'lucide-react';
import { TrainingUnit } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

export type WordActionType = 'recognition' | 'context' | 'significance';

export interface WordAnalysisToolbarProps {
    currentUnit: TrainingUnit | null;
    activeAction: string | null;
    onActionClick: (action: WordActionType) => void;
    isLoading: boolean;
}

interface ToolbarButton {
    action: WordActionType;
    icon: typeof Eye;
    label: string;
    description: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
    {
        action: 'recognition',
        icon: Eye,
        label: 'Reconocer',
        description: '¿Cómo reconocer esta forma?'
    },
    {
        action: 'context',
        icon: FileText,
        label: 'Contexto',
        description: 'Función en contexto'
    },
    {
        action: 'significance',
        icon: Heart,
        label: 'Teología',
        description: 'Significado teológico'
    }
];

/**
 * WordAnalysisToolbar - Floating toolbar for word-specific analysis actions
 * 
 * Appears on the right side when a word (TrainingUnit) is selected.
 * Provides quick access to recognition, context, and theological significance.
 */
export const WordAnalysisToolbar: React.FC<WordAnalysisToolbarProps> = ({
    currentUnit,
    activeAction,
    onActionClick,
    isLoading
}) => {
    // Don't render if no unit is selected
    if (!currentUnit) {
        return null;
    }

    return (
        <div
            className="fixed right-6 top-1/2 -translate-y-1/2 z-20 animate-in slide-in-from-right duration-300"
            role="toolbar"
            aria-label="Análisis de palabra"
        >
            <div className="bg-background border-2 shadow-lg rounded-lg p-2 space-y-2">
                {/* Word indicator */}
                <div className="text-center pb-2 border-b">
                    <p className="text-xs text-muted-foreground font-medium">Analizar</p>
                    <p className="text-sm font-greek font-bold text-primary">
                        {currentUnit.greekForm.text}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-1">
                    {TOOLBAR_BUTTONS.map(({ action, icon: Icon, label, description }) => {
                        const isActive = activeAction === action;
                        const isCurrentLoading = isLoading && isActive;

                        return (
                            <button
                                key={action}
                                onClick={() => onActionClick(action)}
                                disabled={isCurrentLoading}
                                className={cn(
                                    "w-full flex flex-col items-center gap-1 p-3 rounded-md transition-all",
                                    "hover:bg-primary/10 hover:scale-105",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    isActive && "bg-primary/20 border-2 border-primary shadow-sm"
                                )}
                                title={description}
                                aria-label={description}
                            >
                                <Icon 
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )} 
                                />
                                <span 
                                    className={cn(
                                        "text-[10px] font-medium",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="pt-2 border-t">
                        <div className="flex items-center justify-center gap-1">
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="h-1 w-1 bg-primary rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
