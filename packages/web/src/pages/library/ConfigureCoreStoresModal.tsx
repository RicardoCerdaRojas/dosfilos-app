import { useEffect, useState } from 'react';
import { LibraryResourceEntity } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Mic2, Library, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

interface ConfigureCoreStoresModalProps {
    resource: LibraryResourceEntity;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (resource: LibraryResourceEntity) => void;
}

type CoreStore = string;

const defaultMeta: Record<string, any> = {
    exegesis: {
        label: 'Exégesis',
        icon: BookOpen,
        color: 'text-blue-500',
        description: 'Léxicos griego/hebreo, hermenéutica, gramática'
    },
    homiletics: {
        label: 'Homilética',
        icon: Mic2,
        color: 'text-purple-500',
        description: 'Predicación, teología sistemática, sermones'
    },
    generic: {
        label: 'Genérico',
        icon: Library,
        color: 'text-amber-500',
        description: 'Recursos de uso general para todos los contextos'
    }
};

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
    const [availableStores, setAvailableStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            loadStoreConfig();
        }
    }, [open]);

    // Update selected stores if resource changes
    useEffect(() => {
        setSelectedStores(resource.coreStores || []);
    }, [resource]);

    const loadStoreConfig = async () => {
        setLoading(true);
        try {
            const db = getFirestore();
            const docRef = doc(db, 'config/coreLibraryStores');
            const docSnap = await getDoc(docRef);
            
            let storeKeys: string[] = ['exegesis', 'homiletics', 'generic']; // Defaults
            let descriptions: Record<string, string> = {};

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.stores) {
                    storeKeys = Object.keys(data.stores);
                }
                if (data.descriptions) {
                    descriptions = data.descriptions;
                }
            }

            // Map keys to display objects
            const stores = storeKeys.map(key => {
                const meta = defaultMeta[key] || {
                    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
                    icon: Database,
                    color: 'text-slate-500',
                    description: descriptions[key] || 'Contexto personalizado'
                };
                return {
                    store: key,
                    ...meta
                };
            });
            
            setAvailableStores(stores);

        } catch (error) {
            console.error("Error loading store config:", error);
            // Fallback to defaults
            setAvailableStores(Object.keys(defaultMeta).map(key => ({ store: key, ...defaultMeta[key] })));
        } finally {
            setLoading(false);
        }
    };

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
                    
                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {availableStores.map(({ store, label, icon: Icon, color, description }) => (
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
                    )}
                    
                    {!loading && selectedStores.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                            ✓ Documento en {selectedStores.length} store(s)
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || loading}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
