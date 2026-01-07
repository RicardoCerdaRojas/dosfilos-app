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
import { useTranslation } from 'react-i18next';

export type SermonFormData = {
  title: string;
  category?: string;
  content: string;
  bibleReferences: string[];
  tags: string[];
  authorName?: string;
  status: 'working' | 'draft' | 'published' | 'archived';
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
  const { t } = useTranslation('sermonDetail');
  
  // Use localized label if default default, otherwise respect prop
  const resolvedSubmitLabel = submitLabel === 'Guardar' ? t('form.save') : submitLabel;

  const [title, setTitle] = useState(defaultValues?.title || '');
  const [category, setCategory] = useState(defaultValues?.category || '');
  const [content, setContent] = useState(defaultValues?.content || '');
  const [bibleReferences, setBibleReferences] = useState<string[]>(defaultValues?.bibleReferences || []);
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [authorName, setAuthorName] = useState(defaultValues?.authorName || '');
  const [status, setStatus] = useState<'working' | 'draft' | 'published' | 'archived'>(defaultValues?.status || 'draft');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors: Record<string, string> = {};
    
    
    if (!title || title.length < 5) {
      newErrors.title = t('form.titleError');
    }
    
    if (!content || content.trim().length === 0) {
      newErrors.content = t('form.contentError');
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
      authorName: authorName || undefined,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t('form.title')} *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('form.titlePlaceholder')}
          disabled={loading}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">{t('form.category')}</Label>
        <Select
          value={category}
          onValueChange={setCategory}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('form.categoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="evangelismo">{t('form.categories.evangelismo')}</SelectItem>
            <SelectItem value="discipulado">{t('form.categories.discipulado')}</SelectItem>
            <SelectItem value="adoracion">{t('form.categories.adoracion')}</SelectItem>
            <SelectItem value="familia">{t('form.categories.familia')}</SelectItem>
            <SelectItem value="juventud">{t('form.categories.juventud')}</SelectItem>
            <SelectItem value="matrimonio">{t('form.categories.matrimonio')}</SelectItem>
            <SelectItem value="finanzas">{t('form.categories.finanzas')}</SelectItem>
            <SelectItem value="oracion">{t('form.categories.oracion')}</SelectItem>
            <SelectItem value="otro">{t('form.categories.otro')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Author Name */}
      <div className="space-y-2">
        <Label htmlFor="authorName">{t('form.author')}</Label>
        <Input
          id="authorName"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={t('form.authorPlaceholder')}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          {t('form.authorHelp')}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>{t('form.content')} *</Label>
        <textarea
          className="w-full min-h-[300px] p-4 border rounded-lg"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('form.contentPlaceholder')}
          disabled={loading}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content}</p>
        )}
      </div>

      {/* Bible References */}
      <div className="space-y-2">
        <Label>{t('form.bibleRefs')}</Label>
        <TagInput
          tags={bibleReferences}
          onChange={setBibleReferences}
          placeholder={t('form.bibleRefsPlaceholder')}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          {t('form.bibleRefsHelp')}
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>{t('form.tags')}</Label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder={t('form.tagsPlaceholder')}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          {t('form.tagsHelp')}
        </p>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">{t('form.status')}</Label>
        <Select
          value={status}
          onValueChange={(value: any) => setStatus(value)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
            <SelectItem value="published">{t('status.published')}</SelectItem>
            <SelectItem value="archived">{t('status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? t('form.saving') : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
