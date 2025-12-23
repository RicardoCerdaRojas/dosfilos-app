import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrainingUnit } from '@dosfilos/domain';
import { ActionButton } from './ActionButton';
import { UnitNavigationItem } from './UnitNavigationItem';
import { 
    Sparkles, 
    Eye, 
    BookText, 
    Heart,
    Brain,
    BookOpen,
    ChevronDown,
    ChevronUp,
    Circle,
    Trash2,
    GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionType = 'morphology' | 'recognition' | 'context' | 'significance' | 'quiz' | 'passage' | 'syntax';

export interface InteractionPanelProps {
    units: TrainingUnit[];
    currentIndex: number;
    onNavigate: (index: number) => void;
    onActionClick: (action: ActionType) => void;
    onChatMessage?: (message: string) => void;
    activeAction: ActionType | null;
    isActionLoading: boolean;
    onDeleteUnit?: (unitId: string) => void; // Callback to delete a unit
}

/**
 * Interaction panel - sidebar with actions, chat, and unit navigation.
 * Follows Single Responsibility - manages user interaction options.
 */
export const InteractionPanel: React.FC<InteractionPanelProps> = ({
    units,
    currentIndex,
    onNavigate,
    onActionClick,
    onChatMessage,
    activeAction,
    isActionLoading,
    onDeleteUnit
}) => {
    const [showUnits, setShowUnits] = useState(true);

    // Derive currentUnit from units array based on currentIndex
    const currentUnit = units[currentIndex];

    return (
        <div className="h-full flex flex-col bg-muted/30 border-r">
            {/* Header - Current Unit */}
            <div className="p-3 border-b bg-background/50 backdrop-blur-sm shrink-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Unidad {currentIndex + 1} de {units.length}
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-xl font-serif text-primary font-bold">
                        {currentUnit?.greekForm.text}
                    </h3>
                    <p className="text-xs text-muted-foreground italic">
                        {currentUnit?.greekForm.transliteration}
                    </p>
                    <p className="text-xs text-foreground">
                        "{currentUnit?.greekForm.gloss}"
                    </p>
                    {/* Identification badge */}
                    <div className="pt-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {currentUnit?.identification}
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Units Navigation - Now first after header */}
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowUnits(!showUnits)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                            <span>Todas las Unidades</span>
                            {showUnits ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {showUnits && (
                            <div className="space-y-1">
                                {units.map((unit, idx) => (
                                    <li key={unit.id} className="flex items-center gap-2">
                                        <button
                                            onClick={() => onNavigate(idx)}
                                            className={cn(
                                                "flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors",
                                                idx === currentIndex
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "hover:bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Circle className={cn("h-3 w-3", idx === currentIndex ? "fill-primary" : "")} />
                                                <span className="text-xs">#{idx + 1}</span>
                                                <span className="font-greek">{unit.greekForm.text}</span>
                                            </div>
                                            <div className="text-xs opacity-70">{unit.identification}</div>
                                        </button>
                                        {onDeleteUnit && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`¿Eliminar "${unit.greekForm.text}" de las unidades?`)) {
                                                        onDeleteUnit(unit.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors group"
                                                title="Eliminar unidad"
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-red-500" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Acciones
                        </h4>
                        <div className="space-y-1.5">
                            <ActionButton
                                icon={Sparkles}
                                label="Descomposición Morfológica"
                                description="Componentes de la palabra"
                                onClick={() => onActionClick('morphology')}
                                isActive={activeAction === 'morphology'}
                                isLoading={isActionLoading && activeAction === 'morphology'}
                            />
                            <ActionButton
                                icon={Eye}
                                label="¿Cómo reconocer esta forma?"
                                description="Aprende a identificarla"
                                onClick={() => onActionClick('recognition')}
                                isActive={activeAction === 'recognition'}
                                isLoading={isActionLoading && activeAction === 'recognition'}
                            />
                            <ActionButton
                                icon={BookText}
                                label="Función en Contexto"
                                description="Su rol en este pasaje"
                                onClick={() => onActionClick('context')}
                                isActive={activeAction === 'context'}
                                isLoading={isActionLoading && activeAction === 'context'}
                            />
                            <ActionButton
                                icon={Heart}
                                label="Significado Teológico"
                                description="Para la predicación"
                                onClick={() => onActionClick('significance')}
                                isActive={activeAction === 'significance'}
                                isLoading={isActionLoading && activeAction === 'significance'}
                            />
                            <ActionButton
                                icon={Brain}
                                label="Quiz de Comprensión"
                                description="Practica lo aprendido"
                                onClick={() => onActionClick('quiz')}
                                isActive={activeAction === 'quiz'}
                                isLoading={isActionLoading && activeAction === 'quiz'}
                            />
                            <ActionButton
                                icon={BookOpen}
                                label="Leer Pasaje"
                                description="Explora el texto completo"
                                onClick={() => onActionClick('passage')}
                                isActive={activeAction === 'passage'}
                                isLoading={isActionLoading && activeAction === 'passage'}
                            />
                            <ActionButton
                                icon={GitBranch}
                                label="Estructura Sintáctica"
                                description="Ver cláusulas y relaciones"
                                onClick={() => onActionClick('syntax')}
                                isActive={activeAction === 'syntax'}
                                isLoading={isActionLoading && activeAction === 'syntax'}
                            />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
