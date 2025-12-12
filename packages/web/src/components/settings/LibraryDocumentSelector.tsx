import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentSelectorDialog } from './DocumentSelectorDialog';
import { BookOpen, FileText, Sparkles } from 'lucide-react';
import { LibraryResourceEntity, WorkflowPhase } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

interface LibraryDocumentSelectorProps {
    phase: WorkflowPhase;
    phaseName: string;
    selectedDocIds: string[];
    onChange: (docIds: string[]) => void;
}

export function LibraryDocumentSelector({ phase, phaseName, selectedDocIds, onChange }: LibraryDocumentSelectorProps) {
    const { user } = useFirebase();
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tempSelection, setTempSelection] = useState<string[]>([]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        const unsubscribe = libraryService.subscribeToUserResources(
            user.uid, 
            (newResources) => {
                setResources(newResources);
                setLoading(false);
            },
            (error) => {
                console.error("Error subscribing to resources:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    const handleOpen = () => {
        setTempSelection([...selectedDocIds]);
        setOpen(true);
    };

    const handleToggle = (resourceId: string) => {
        setTempSelection(prev => 
            prev.includes(resourceId) 
                ? prev.filter(id => id !== resourceId)
                : [...prev, resourceId]
        );
    };

    const handleSave = () => {
        onChange(tempSelection);
        setOpen(false);
    };

    const selectedResources = resources.filter(r => selectedDocIds.includes(r.id));
    // Include both legacy indexed resources AND AI Ready resources
    const availableResources = resources.filter(r => 
        r.textExtractionStatus === 'ready' || (r.metadata && r.metadata.geminiUri)
    );

    const totalPages = selectedResources.reduce((acc, resource) => {
        const pages = resource.pageCount || resource.metadata?.pageCount || Math.ceil(resource.sizeBytes / 2000);
        return acc + pages;
    }, 0);

    const isOverLimit = totalPages > 1000;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <Label className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Documentos de Biblioteca
                    </Label>
                    {selectedResources.length > 0 && (
                        <span className={`text-xs ${isOverLimit ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                            Total: {totalPages} páginas {isOverLimit && '(>1000 límite recomendado)'}
                        </span>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={handleOpen}>
                    {selectedDocIds.length > 0 ? 'Editar selección' : 'Seleccionar documentos'}
                </Button>
                
                <DocumentSelectorDialog 
                    open={open}
                    onOpenChange={setOpen}
                    phaseName={phaseName}
                    resources={resources}
                    selectedIds={selectedDocIds}
                    onSave={onChange}
                    loading={loading}
                />
            </div>

            {/* Show selected documents */}
            {selectedResources.length > 0 ? (
                <div className="space-y-2">
                    {selectedResources.map(resource => {
                        const isAiReady = resource.metadata?.geminiUri;
                        return (
                            <div key={resource.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate font-medium">{resource.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {resource.pageCount || resource.metadata?.pageCount 
                                                ? `${resource.pageCount || resource.metadata?.pageCount} págs.` 
                                                : `~${Math.ceil(resource.sizeBytes / 2000)} págs. (est.)`
                                            }
                                        </span>
                                    </div>
                                </div>
                                <Badge variant={isAiReady ? "secondary" : "outline"} className={isAiReady ? "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 text-xs" : "text-xs"}>
                                    {isAiReady ? (
                                        <>
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI Cache
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen className="h-3 w-3 mr-1" />
                                            RAG
                                        </>
                                    )}
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">
                    Sin documentos seleccionados. Se usarán todos los documentos de la biblioteca como contexto general.
                </p>
            )}
        </div>
    );
}
