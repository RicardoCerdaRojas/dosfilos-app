import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrainingUnit } from '@dosfilos/domain';
import { ActionButton } from './ActionButton';
import { 
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
    activeAction: ActionType | null;
    isActionLoading: boolean;
    onDeleteUnit?: (unitId: string) => void;
}

/**
 * InteractionPanel - Simplified sidebar for pedagogical navigation
 * 
 * Organized into three pedagogical sections:
 * 1. Contexto General del Pasaje
 * 2. Unidades de Estudio (word list)
 * 3. Refuerzo del Aprendizaje
 * 
 * Word-specific actions (morphology, recognition, context, significance) 
 * are now handled by the WordAnalysisToolbar component.
 */
export const InteractionPanel: React.FC<InteractionPanelProps> = ({
    units,
    currentIndex,
    onNavigate,
    onActionClick,
    activeAction,
    isActionLoading,
    onDeleteUnit
}) => {
    const [showUnits, setShowUnits] = useState(true);
    const [showContext, setShowContext] = useState(true);
    const [showReinforcement, setShowReinforcement] = useState(true);

    // Derive currentUnit from units array based on currentIndex
    const currentUnit = units[currentIndex];

    // Check if we should show word viewer
    // Show only when: NOT in passage/syntax mode OR there's a selected unit being analyzed
    const showWordViewer = currentUnit && (activeAction !== 'passage' && activeAction !== 'syntax');

    return (
        <div className="h-full flex flex-col bg-muted/30 border-r">

            {/* Scrollable content - Pedagogical sections */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* SECTION 1: Contexto General del Pasaje */}
                    <section className="space-y-2">
                        <button
                            onClick={() => setShowContext(!showContext)}
                            className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
                        >
                            <span>📖 Contexto General</span>
                            {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {showContext && (
                            <div className="space-y-1.5 pl-1">
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
                        )}
                    </section>

                    {/* SECTION 2: Unidades de Estudio */}
                    <section className="space-y-2">
                        <button
                            onClick={() => setShowUnits(!showUnits)}
                            className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
                        >
                            <span>📚 Unidades de Estudio</span>
                            {showUnits ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {showUnits && (
                            <>
                                {/* Word Viewer - Moved from header to Units section */}
                                {showWordViewer && (
                                    <div className="mb-3 p-3 border rounded-md bg-background/50 backdrop-blur-sm">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                            Unidad {currentIndex + 1} de {units.length}
                                        </div>
                                        <div className="space-y-1.5">
                                            <h3 className="text-xl font-serif text-primary font-bold">
                                                {currentUnit.greekForm.text}
                                            </h3>
                                            <p className="text-xs text-muted-foreground italic">
                                                {currentUnit.greekForm.transliteration}
                                            </p>
                                            <p className="text-xs text-foreground">
                                                "{currentUnit.greekForm.gloss}"
                                            </p>
                                            {/* Identification badge */}
                                            <div className="pt-0.5">
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                                    {currentUnit.identification}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Units list */}
                                <div className="space-y-1">
                                    {units.map((unit, idx) => (
                                        <div key={unit.id} className="flex items-center gap-2">
                                            <button
                                                onClick={() => onNavigate(idx)}
                                                className={cn(
                                                    "flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors",
                                                    // Only highlight if this is current index AND we're not viewing passage/syntax
                                                    idx === currentIndex && activeAction !== 'passage' && activeAction !== 'syntax'
                                                        ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                                                        : "hover:bg-muted text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Circle className={cn(
                                                        "h-2 w-2",
                                                        idx === currentIndex && activeAction !== 'passage' && activeAction !== 'syntax'
                                                            ? "fill-primary"
                                                            : "fill-muted-foreground"
                                                    )} />
                                                    <span className="text-xs font-semibold">#{idx + 1}</span>
                                                    <span className="font-greek text-sm">{unit.greekForm.text}</span>
                                                </div>
                                                <div className="text-[10px] opacity-70 mt-0.5 ml-4">{unit.identification}</div>
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
                                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="pl-1 pt-1">
                            <p className="text-[10px] text-muted-foreground italic">
                                💡 Al seleccionar una palabra se mostrará su análisis morfológico automáticamente
                            </p>
                        </div>
                    </section>

                    {/* SECTION 3: Refuerzo del Aprendizaje */}
                    <section className="space-y-2">
                        <button
                            onClick={() => setShowReinforcement(!showReinforcement)}
                            className="w-full flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
                        >
                            <span>🧠 Refuerzo del Aprendizaje</span>
                            {showReinforcement ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {showReinforcement && (
                            <div className="space-y-1.5 pl-1">
                                <ActionButton
                                    icon={Brain}
                                    label="Quiz de Comprensión"
                                    description="Practica lo aprendido"
                                    onClick={() => onActionClick('quiz')}
                                    isActive={activeAction === 'quiz'}
                                    isLoading={isActionLoading && activeAction === 'quiz'}
                                />
                            </div>
                        )}
                    </section>
                </div>
            </ScrollArea>
        </div>
    );
};
