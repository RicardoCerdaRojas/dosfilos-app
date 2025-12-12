import { useState, useEffect } from 'react';
import { LibraryResourceEntity, ResourceType } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface EditResourceModalProps {
    resource: LibraryResourceEntity | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: { title: string; author: string; type: ResourceType }) => Promise<void>;
}

export function EditResourceModal({ resource, open, onOpenChange, onSave }: EditResourceModalProps) {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [type, setType] = useState<ResourceType>('theology');
    const [saving, setSaving] = useState(false);

    // Reset form when resource changes
    useEffect(() => {
        if (resource) {
            setTitle(resource.title);
            setAuthor(resource.author);
            setType(resource.type);
        }
    }, [resource]);

    const handleSave = async () => {
        if (!resource) return;
        setSaving(true);
        try {
            await onSave(resource.id, { title, author, type });
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Recurso</DialogTitle>
                    <DialogDescription>
                        Modifica los metadatos del documento.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">Título</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título del documento"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-author">Autor</Label>
                        <Input
                            id="edit-author"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="Nombre del autor"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-type">Categoría</Label>
                        <Select value={type} onValueChange={(v: ResourceType) => setType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="theology">Teología Sistemática</SelectItem>
                                <SelectItem value="grammar">Gramática / Idiomas</SelectItem>
                                <SelectItem value="commentary">Comentario Bíblico</SelectItem>
                                <SelectItem value="article">Artículo / Paper</SelectItem>
                                <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !title.trim()}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
