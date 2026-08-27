import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { coreLibraryAdminService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Crear y editar un almacén del corpus base.
 *
 * LOS DOS FORMULARIOS GUARDAN SU ESTADO ADENTRO. Eran seis campos sueltos en un
 * componente de 2.400 líneas, así que teclear el nombre de un almacén repintaba
 * la página entera. Van juntos en un archivo porque son la misma operación en
 * dos momentos —dar de alta y corregir— y comparten forma.
 */

interface CreateProps {
    open: boolean;
    onClose: () => void;
    /** Recibe la clave del almacén nuevo: el padre cambia a esa pestaña. */
    onCreated: (key: string) => void | Promise<void>;
}

export function CreateStoreDialog({ open, onClose, onCreated }: CreateProps) {
    const [key, setKey] = useState('');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const crear = async () => {
        if (!key || !name) {
            toast.error('Clave y Nombre son requeridos');
            return;
        }
        // La clave viaja en rutas y en ids de documento: sin este formato, un
        // espacio o un acento producen un almacén al que después no se llega.
        if (!/^[a-z0-9-]+$/.test(key)) {
            toast.error('La clave debe contener solo letras minúsculas, números y guiones');
            return;
        }
        try {
            setSaving(true);
            await coreLibraryAdminService.createStore({ key, displayName: name, description: desc });
            toast.success(`Store '${name}' creado correctamente`);
            onClose();
            setKey('');
            setName('');
            setDesc('');
            await onCreated(key);
        } catch (error: any) {
            console.error('Error creating store:', error);
            toast.error(`Error al crear store: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogTrigger asChild>
            <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Store
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Store</DialogTitle>
                <DialogDescription>
                    Crea un nuevo contexto de archivos para el asistente.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre (Display Name)</Label>
                    <Input 
                        placeholder="Ej: Historia de la Iglesia" 
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            // Auto-generate slug if empty
                            if (!key && e.target.value) {
                                setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                            }
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Clave (Key ID)</Label>
                    <Input 
                        placeholder="ej: historia-iglesia" 
                        value={key}
                        onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-xs text-muted-foreground">Identificador único (slug) usado internamente.</p>
                </div>
                <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea 
                        placeholder="Descripción breve del contenido de este store..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={crear} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Store
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    );
}

interface EditProps {
    /** Almacén a editar, o `null` cuando está cerrado. */
    store: { key: string; name: string; description: string } | null;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

export function EditStoreDialog({ store, onClose, onSaved }: EditProps) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const open = Boolean(store);

    useEffect(() => {
        if (!store) return;
        setName(store.name);
        setDesc(store.description);
    }, [store]);

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store || !name.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }
        try {
            setSaving(true);
            await coreLibraryAdminService.updateStore(store.key, name.trim(), desc.trim());
            toast.success('Store actualizado exitosamente');
            onClose();
            await onSaved();
        } catch (error: any) {
            toast.error(`Error al actualizar store: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Store</DialogTitle>
                    <DialogDescription>
                        Actualiza el nombre y descripción del store. Cambiar el nombre actualizará el Display Name en la API de Gemini.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={guardar} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="editKey">Clave del Contexto (No editable)</Label>
                        <Input
                            id="editKey"
                            value={store?.key ?? ''}
                            disabled
                            className="bg-muted"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editName">Nombre para Mostrar <span className="text-destructive">*</span></Label>
                        <Input
                            id="editName"
                            placeholder="Ej: Teología Sistemática"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editDesc">Descripción</Label>
                        <Textarea
                            id="editDesc"
                            placeholder="Breve descripción del propósito de este store..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
