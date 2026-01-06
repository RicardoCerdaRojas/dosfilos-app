import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Sparkles } from 'lucide-react';
import { LibraryResourceEntity, WorkflowPhase } from '@dosfilos/domain';

interface DocumentSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    phaseName: string;
    resources: LibraryResourceEntity[];
    selectedIds: string[];
    onSave: (ids: string[]) => void;
    loading: boolean;
}

export function DocumentSelectorDialog({
    open,
    onOpenChange,
    phaseName,
    resources,
    selectedIds,
    onSave,
    loading
}: DocumentSelectorDialogProps) {
    const [tempSelection, setTempSelection] = React.useState<string[]>(selectedIds);

    // Sync selection when dialog opens
    React.useEffect(() => {
        if (open) {
            setTempSelection(selectedIds);
        }
    }, [open, selectedIds]);

    const handleToggle = (resourceId: string) => {
        setTempSelection(prev => 
            prev.includes(resourceId) 
                ? prev.filter(id => id !== resourceId)
                : [...prev, resourceId]
        );
    };

    const handleSave = () => {
        // Filter out any IDs that don't exist in the current resources list (cleanup ghost IDs)
        const validIds = tempSelection.filter(id => resources.some(r => r.id === id));
        onSave(validIds);
        onOpenChange(false);
    };

    // Filter available resources (AI Ready or text extracted)
    const availableResources = resources.filter(r => 
        r.textExtractionStatus === 'ready' || (r.metadata && r.metadata.geminiUri)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
                {/* Header - Fixed */}
                <DialogHeader className="px-6 py-4 border-b bg-background z-10 flex-none">
                    <DialogTitle>Documentos para {phaseName}</DialogTitle>
                </DialogHeader>
                
                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-muted/5">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p>Cargando biblioteca...</p>
                        </div>
                    ) : availableResources.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <BookOpen className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">Tu biblioteca está vacía</p>
                            <p className="text-sm mt-1 opacity-70">Sube documentos para usarlos como contexto.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {availableResources.map(resource => {
                                const isAiReady = resource.metadata?.geminiUri;
                                const isSelected = tempSelection.includes(resource.id);
                                
                                return (
                                    <div 
                                        key={resource.id}
                                        className={`
                                            group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer
                                            ${isSelected 
                                                ? 'bg-primary/5 border-primary shadow-sm' 
                                                : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                                            }
                                        `}
                                        onClick={() => handleToggle(resource.id)}
                                    >
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggle(resource.id)}
                                            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-medium leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                        {resource.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        <span>{resource.author}</span>
                                                        <span>•</span>
                                                        <span>
                                                            {resource.pageCount || resource.metadata?.pageCount 
                                                                ? `${resource.pageCount || resource.metadata?.pageCount} págs.` 
                                                                : `~${Math.ceil(resource.sizeBytes / 2000)} págs. (est.)`
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                                {isAiReady && (
                                                    <Badge variant="secondary" className="shrink-0 h-5 px-2 text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-100 gap-1 shadow-none">
                                                        <Sparkles className="h-2.5 w-2.5" />
                                                        AI Ready
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            {resource.preferredForPhases && resource.preferredForPhases.length > 0 && (
                                                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                                                    {resource.preferredForPhases.map(p => (
                                                        <Badge key={p} variant="outline" className="text-[10px] h-5 px-1.5 bg-background/50 text-muted-foreground border-border/50">
                                                            {p === WorkflowPhase.EXEGESIS && 'Exégesis'}
                                                            {p === WorkflowPhase.HOMILETICS && 'Homilética'}
                                                            {p === WorkflowPhase.DRAFTING && 'Redacción'}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer - Fixed */}
                <DialogFooter className="px-6 py-4 border-t bg-background z-10 flex-none shadow-[0_-1px_10px_rgba(0,0,0,0.03)]">
                    <div className="flex w-full items-center justify-between sm:justify-end gap-3">
                        <div className="hidden sm:block text-xs text-muted-foreground mr-auto">
                            {tempSelection.length} documento{tempSelection.length !== 1 && 's'} seleccionado{tempSelection.length !== 1 && 's'}
                        </div>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} className="min-w-[100px]">
                            Guardar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import * as React from 'react';
