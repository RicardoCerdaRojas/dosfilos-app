import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { coreLibraryAdminService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Props {
    /** Documento a editar, o `null` cuando el diálogo está cerrado. */
    doc: { id: string; title?: string; author?: string; publiclyCitable?: boolean } | null;
    onClose: () => void;
    /** Se llama tras guardar, para que el padre recargue lo que muestra. */
    onSaved: () => void | Promise<void>;
}

/**
 * Corrige título, autor y licencia de un documento del corpus base.
 *
 * EL ESTADO DEL FORMULARIO VIVE ACÁ, y ése es el punto del cambio. Antes los
 * cuatro campos eran estado de `CoreLibraryAdmin`, un componente de 2.400
 * líneas: cada tecla en el título repintaba la página entera —las listas de
 * documentos de todos los almacenes incluidas— para actualizar un input. Con el
 * estado adentro, escribir acá sólo redibuja este diálogo.
 *
 * Se siembra desde `doc` al abrirse: si el formulario recordara lo escrito para
 * OTRO documento, guardaría el título de uno encima de otro sin que nada avise.
 */
export function EditDocDialog({ doc, onClose, onSaved }: Props) {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [publiclyCitable, setPubliclyCitable] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!doc) return;
        setTitle(doc.title ?? '');
        setAuthor(doc.author ?? '');
        setPubliclyCitable(doc.publiclyCitable === true);
    }, [doc]);

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!doc || !title.trim()) {
            toast.error('El título es obligatorio');
            return;
        }
        try {
            setSaving(true);
            await coreLibraryAdminService.updateResourceMetadata(doc.id, {
                title: title.trim(),
                author: author.trim(),
                publiclyCitable,
            });
            toast.success('Metadata actualizada');
            onClose();
            await onSaved();
        } catch (error: any) {
            toast.error(`Error actualizando metadata: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={Boolean(doc)} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar metadata del documento</DialogTitle>
                    <DialogDescription>
                        Corrige el título y autor si fueron extraídos incorrectamente. No afecta el contenido indexado.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={guardar} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="editDocTitle">Título <span className="text-destructive">*</span></Label>
                        <Input
                            id="editDocTitle"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Título del documento"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editDocAuthor">Autor</Label>
                        <Input
                            id="editDocAuthor"
                            value={author}
                            onChange={e => setAuthor(e.target.value)}
                            placeholder="Nombre del autor"
                        />
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-lg border p-4 bg-muted/30">
                        <div className="space-y-1 flex-1 min-w-0">
                            <Label htmlFor="editDocPubliclyCitable" className="text-sm font-semibold">
                                Citable públicamente
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Activa este switch SOLO para material de dominio público (Calvino, Spurgeon,
                                Matthew Henry, patrística, Gesenius, etc.) o con licencia explícita firmada.
                                Cuando está apagado, los usuarios regulares NO ven las citas de este documento
                                aunque se use para RAG interno.
                            </p>
                        </div>
                        <Switch
                            id="editDocPubliclyCitable"
                            checked={publiclyCitable}
                            onCheckedChange={setPubliclyCitable}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

    );
}
