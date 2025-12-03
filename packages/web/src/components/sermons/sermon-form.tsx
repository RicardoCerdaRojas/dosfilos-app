import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from './tag-input';

export type SermonFormData = {
  title: string;
  category?: string;
  content: string;
  bibleReferences: string[];
  tags: string[];
  status: 'draft' | 'published' | 'archived';
};

interface SermonFormProps {
  defaultValues?: Partial<SermonFormData>;
  onSubmit: (data: SermonFormData) => void | Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export function SermonForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  loading = false,
}: SermonFormProps) {
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [category, setCategory] = useState(defaultValues?.category || '');
  const [content, setContent] = useState(defaultValues?.content || '');
  const [bibleReferences, setBibleReferences] = useState<string[]>(defaultValues?.bibleReferences || []);
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(defaultValues?.status || 'draft');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors: Record<string, string> = {};
    
    if (!title || title.length < 5) {
      newErrors.title = 'El título debe tener al menos 5 caracteres';
    }
    
    if (!content || content.trim().length === 0) {
      newErrors.content = 'El contenido es requerido';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    await onSubmit({
      title,
      category: category || undefined,
      content,
      bibleReferences,
      tags,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título del Sermón *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: El amor de Dios"
          disabled={loading}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <Select
          value={category}
          onValueChange={setCategory}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="evangelismo">Evangelismo</SelectItem>
            <SelectItem value="discipulado">Discipulado</SelectItem>
            <SelectItem value="adoracion">Adoración</SelectItem>
            <SelectItem value="familia">Familia</SelectItem>
            <SelectItem value="juventud">Juventud</SelectItem>
            <SelectItem value="matrimonio">Matrimonio</SelectItem>
            <SelectItem value="finanzas">Finanzas</SelectItem>
            <SelectItem value="oracion">Oración</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>Contenido del Sermón *</Label>
        <textarea
          className="w-full min-h-[300px] p-4 border rounded-lg"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe el contenido de tu sermón..."
          disabled={loading}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content}</p>
        )}
      </div>

      {/* Bible References */}
      <div className="space-y-2">
        <Label>Referencias Bíblicas</Label>
        <TagInput
          tags={bibleReferences}
          onChange={setBibleReferences}
          placeholder="Ej: Juan 3:16, Romanos 8:28"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Agrega las referencias bíblicas que usarás en el sermón
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Etiquetas</Label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Ej: salvación, gracia, fe"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Agrega etiquetas para organizar tus sermones
        </p>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Estado</Label>
        <Select
          value={status}
          onValueChange={(value: any) => setStatus(value)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="archived">Archivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
