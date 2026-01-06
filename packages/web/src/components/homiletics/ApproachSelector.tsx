/**
 * Approach Selector Component
 * 
 * Allows user to select a homiletical approach from multiple options
 * @layer Presentation - Pure UI component, no business logic
 */

import { HomileticalApproach } from '@dosfilos/domain';
import { ApproachCard } from './ApproachCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ApproachSelectorProps {
    approaches: HomileticalApproach[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onConfirm: () => void;
}

export function ApproachSelector({ 
    approaches, 
    selectedId, 
    onSelect,
    onConfirm 
}: ApproachSelectorProps) {
    const hasSelection = !!selectedId;
    const selectedApproach = approaches.find(a => a.id === selectedId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Elige el Enfoque de tu Sermón</h2>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Se han generado {approaches.length} enfoques diferentes para predicar este pasaje.
                    Selecciona el que mejor se ajuste a tu contexto y audiencia.
                </p>
            </div>

            {/* Approaches Grid - Single column for maximum width */}
            <div className="grid gap-6 grid-cols-1">
                {approaches.map((approach) => (
                    <ApproachCard
                        key={approach.id}
                        approach={approach}
                        isSelected={selectedId === approach.id}
                        onSelect={() => onSelect(approach.id)}
                    />
                ))}
            </div>

            {/* Selected Approach Summary */}
            {selectedApproach && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <span className="text-primary">✓</span> Enfoque Seleccionado:
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">{selectedApproach.type}:</span> {selectedApproach.direction}
                    </p>
                    {selectedApproach.homileticalProposition && (
                        <div>
                            <p className="text-xs italic text-muted-foreground border-l-2 border-primary pl-3 mb-2">
                                "{selectedApproach.homileticalProposition}"
                            </p>
                            
                            {/* Outline Preview */}
                            {selectedApproach.outlinePreview && selectedApproach.outlinePreview.length > 0 && (
                                <div className="mt-3 pl-3 border-l-2 border-muted">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                        Puntos del Sermón:
                                    </p>
                                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                                        {selectedApproach.outlinePreview.map((point, index) => (
                                            <li key={index} className="flex items-start gap-1.5">
                                                <span className="text-primary mt-0.5">▪</span>
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end border-t pt-4">
                <Button
                    onClick={onConfirm}
                    disabled={!hasSelection}
                    size="lg"
                    className="min-w-[200px]"
                >
                    Desarrollar este Enfoque
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Help Text */}
            {!hasSelection && (
                <p className="text-xs text-center text-muted-foreground">
                    Haz clic en una tarjeta para seleccionar ese enfoque
                </p>
            )}
        </div>
    );
}
