/**
 * Approach Selection View Component
 * 
 * Step 2a: Shows 4-5 homiletical approach previews for user selection
 * @layer Presentation - Sub-component of StepHomiletics
 * @pattern Component Composition
 * @solid SRP - Single responsibility: display approach options
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { ApproachCard } from '@/components/homiletics/ApproachCard';
import { HomileticalApproachPreview } from '@dosfilos/domain';

interface ApproachSelectionViewProps {
    /** Approach previews generated in Phase 1 */
    previews: HomileticalApproachPreview[];
    
    /** Currently selected approach ID */
    selectedId: string | undefined;
    
    /** Callback when user selects an approach */
    onSelect: (id: string) => void;
    
    /** Callback when user confirms selection */
    onConfirm: () => void;
    
    /** Callback to regenerate approaches */
    onRegenerate: () => void;
    
    /** Whether Phase 2 is currently running */
    developing: boolean;
    
    /** Whether Phase 1 is regenerating */
    regenerating: boolean;
}

export function ApproachSelectionView({
    previews,
    selectedId,
    onSelect,
    onConfirm,
    onRegenerate,
    developing,
    regenerating
}: ApproachSelectionViewProps) {
    const hasSelection = !!selectedId;
    const selectedApproach = previews.find(p => p.id === selectedId);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 mb-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold">Elige el Enfoque de tu Sermón</h2>
                    </div>
                    {/* Regenerate Button */}
                    <Button
                        onClick={onRegenerate}
                        variant="outline"
                        size="sm"
                        disabled={developing || regenerating}
                    >
                        {regenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerar Enfoques
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-muted-foreground">
                    Se han generado <strong>{previews.length} enfoques diferentes</strong> para predicar este pasaje.
                    Selecciona el que mejor se ajuste a tu contexto y audiencia.
                </p>
            </div>

            {/* Scrollable Approaches List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="space-y-4 px-2.5 pt-2.5">
                    {previews.map((preview) => (
                        <ApproachCard
                            key={preview.id}
                            approach={preview as any}
                            isSelected={selectedId === preview.id}
                            onSelect={() => onSelect(preview.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Selection Summary & Action */}
            <div className="flex-shrink-0 mt-6 pt-4 border-t space-y-4">
                {/* Selected Summary */}
                {selectedApproach && (
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-3">
                            <span className="text-primary text-xl">✓</span>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-1">Enfoque Seleccionado:</h4>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">{selectedApproach.type}:</span> {selectedApproach.direction}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Confirm Button */}
                <Button
                    onClick={onConfirm}
                    disabled={!hasSelection || developing}
                    size="lg"
                    className="w-full"
                >
                    {developing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Desarrollando Enfoque...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Desarrollar este Enfoque
                        </>
                    )}
                </Button>

                {/* Help Text */}
                {!hasSelection && !developing && (
                    <p className="text-xs text-center text-muted-foreground">
                        Haz clic en una tarjeta para seleccionar ese enfoque
                    </p>
                )}
            </div>
        </div>
    );
}
