import { useState } from 'react';
import { LibraryResourceEntity } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Mic2, Library, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigureCoreStoresModalProps {
    resource: LibraryResourceEntity;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (resource: LibraryResourceEntity) => void;
}

type CoreStore = 'exegesis' | 'homiletics' | 'generic';

const storeConfig = [
    {
        store: 'exegesis' as CoreStore,
        label: 'Exégesis',
        icon: BookOpen,
        color: 'text-blue-500',
        description: 'Léxicos griego/hebreo, hermenéutica, gramática'
    },
    {
        store: 'homiletics' as CoreStore,
        label: 'Homilética',
        icon: Mic2,
        color: 'text-purple-500',
        description: 'Predicación, teología sistemática, sermones'
    },
    {
        store: 'generic' as CoreStore,
        label: 'Genérico',
        icon: Library,
        color: 'text-amber-500',
        description: 'Recursos de uso general para todos los contextos'
    }
];

export function ConfigureCoreStoresModal({
    resource,
    open,
    onOpenChange,
    onUpdate
}: ConfigureCoreStoresModalProps) {
    const [selectedStores, setSelectedStores] = useState<CoreStore[]>(
        resource.coreStores || []
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleToggleStore = (store: CoreStore) => {
        setSelectedStores(prev =>
            prev.includes(store)
                ? prev.filter(s => s !== store)
                : [...prev, store]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update resource with new stores
            await libraryService.updateResource(resource.id, {
                coreStores: selectedStores
            } as any);
            
            // Create updated resource
            const updatedResource = {
                ...resource,
                coreStores: selectedStores
            } as LibraryResourceEntity;
            
            onUpdate(updatedResource);
            
            if (selectedStores.length > 0) {
                toast.success(`Agregado a ${selectedStores.length} store(s) Core`);
            } else {
                toast.success('Removido de todos los stores Core');
            }
            
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating Core Library stores:', error);
            toast.error('Error al actualizar stores');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Configurar Stores Core</DialogTitle>
                    <DialogDescription>
                        Selecciona en qué stores de la Biblioteca Core incluir este documento
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        <strong>{resource.title}</strong> por {resource.author}
                    </p>
                    
                    <div className="space-y-3">
                        {storeConfig.map(({ store, label, icon: Icon, color, description }) => (
                            <div
                                key={store}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleToggleStore(store)}
                            >
                                <Checkbox
                                    checked={selectedStores.includes(store)}
                                    onCheckedChange={() => handleToggleStore(store)}
                                    className="mt-0.5"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${color}`} />
                                        <Label className="font-medium cursor-pointer">{label}</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {selectedStores.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                            ✓ Documento en {selectedStores.length} store(s)
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
