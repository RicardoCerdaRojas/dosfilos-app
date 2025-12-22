import React, { useState } from 'react';
import { TrainingUnit } from '@dosfilos/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActionButton } from './ActionButton';
import { UnitNavigationItem } from './UnitNavigationItem';
import { 
    Sparkles, 
    Eye, 
    BookText, 
    Heart,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

export type ActionType = 'morphology' | 'recognition' | 'context' | 'significance';

export interface InteractionPanelProps {
    currentUnit: TrainingUnit;
    units: TrainingUnit[];
    currentIndex: number;
    completedUnits: Set<number>;
    onNavigateToUnit: (index: number) => void;
    onActionClick: (action: ActionType) => void;
    onChatMessage: (message: string) => void;
    activeAction: ActionType | null;
    isActionLoading: boolean;
}

/**
 * Interaction panel - sidebar with actions, chat, and unit navigation.
 * Follows Single Responsibility - manages user interaction options.
 */
export const InteractionPanel: React.FC<InteractionPanelProps> = ({
    currentUnit,
    units,
    currentIndex,
    completedUnits,
    onNavigateToUnit,
    onActionClick,
    onChatMessage,
    activeAction,
    isActionLoading
}) => {
    const [showUnits, setShowUnits] = useState(true);

    return (
        <div className="h-full flex flex-col bg-muted/30 border-r">
            {/* Header - Current Unit */}
            <div className="p-3 border-b bg-background/50 backdrop-blur-sm shrink-0">
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
                                    <UnitNavigationItem
                                        key={unit.id}
                                        unit={unit}
                                        index={idx}
                                        isActive={idx === currentIndex}
                                        isCompleted={completedUnits.has(idx)}
                                        onClick={() => onNavigateToUnit(idx)}
                                    />
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
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
