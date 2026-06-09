import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { SermonPreview } from './SermonPreview';
import { SermonSettingsSheet } from './SermonSettingsSheet';
import { RichSermonEditor } from '@/components/ui/RichSermonEditor';
import { Save, Eye, PenLine, Calendar, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  onBack?: () => void;
  /** Extra actions rendered inline in the toolbar's right group (e.g. the tutor toggle). */
  headerActions?: React.ReactNode;
}

import TextareaAutosize from 'react-textarea-autosize';

export function SermonForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Guardar',
  loading = false,
  onBack,
  headerActions,
}: SermonFormProps) {
  const { t } = useTranslation('sermonDetail');
  
  // Use localized label if default, otherwise respect prop
  const resolvedSubmitLabel = submitLabel === 'Guardar' ? t('form.save') : submitLabel;

  // Form State
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [category, setCategory] = useState(defaultValues?.category || '');
  const [content, setContent] = useState(() => {
    const rawContent = defaultValues?.content || '';
    // Strip out legacy AI-generated custom bible links to prevent polluting the editor
    // Handles multiple MDXEditor backslash escaping e.g. \\[📖 Ref\\]\\(#bible-Ref\\)
    const cleaned = rawContent.replace(/\\*\[(.*?)\\*\]\\*\(#bible-[^)]+\\*\)/gi, (_, inner) => {
      return inner.replace(/📖\s*/g, "").replace(/\\/g, "").trim();
    });
    console.log("=== BIBLE LINK DEBUG ===");
    console.log("Raw from DB: ", JSON.stringify(rawContent));
    console.log("Cleaned string: ", JSON.stringify(cleaned));
    return cleaned;
  });
  const [bibleReferences, setBibleReferences] = useState<string[]>(defaultValues?.bibleReferences || []);
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [authorName, setAuthorName] = useState(defaultValues?.authorName || '');
  const [status, setStatus] = useState<'working' | 'draft' | 'published' | 'archived'>(defaultValues?.status || 'draft');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI State
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
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
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 py-2.5 border-b mb-6 bg-background sticky top-0 z-10 px-4 sm:px-6 lg:px-8">
        {/* Left: back + view switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} title={t('common.back', 'Volver')} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
            <Button
              variant={viewMode === 'write' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('write')}
              className="gap-2 text-xs h-8"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('form.write', 'Escribir')}</span>
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="gap-2 text-xs h-8"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('form.preview', 'Vista Previa')}</span>
            </Button>
          </div>
        </div>

        {/* Right: status + actions, all on one row */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                status === 'published' ? 'bg-success' : status === 'archived' ? 'bg-muted-foreground' : 'bg-warning',
              )}
            />
            {t(`status.${status === 'working' ? 'draft' : status}`)}
          </span>

          {headerActions}

          <div className="h-5 w-px bg-border mx-0.5 hidden sm:block" />

          <SermonSettingsSheet
            category={category}
            setCategory={setCategory}
            authorName={authorName}
            setAuthorName={setAuthorName}
            bibleReferences={bibleReferences}
            setBibleReferences={setBibleReferences}
            tags={tags}
            setTags={setTags}
            status={status}
            setStatus={setStatus}
            loading={loading}
          />

          <Button onClick={() => handleSubmit()} disabled={loading} size="sm" className="gap-2 h-8">
            <Save className="h-4 w-4" />
            {loading ? t('form.saving') : resolvedSubmitLabel}
          </Button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto pl-1 pr-4"> {/* Added padding-right for scrollbar */}
        <div className="max-w-3xl mx-auto pb-20">
          
          {viewMode === 'write' ? (
            <div className="space-y-6 animate-in fade-in duration-500">
               {/* Header Area: Title & Meta */}
               <div className="space-y-4 mb-8">
                  <TextareaAutosize
                    ref={titleRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título del Sermón..."
                    className="w-full resize-none border-none bg-transparent text-4xl font-serif font-bold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 px-0 py-2 leading-snug overflow-hidden"
                    minRows={1}
                  />
                  
                  <div className="flex items-center gap-6 text-muted-foreground text-sm">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <input 
                            value={authorName} 
                            onChange={(e) => setAuthorName(e.target.value)} 
                            placeholder="Agregar autor..."
                            className="bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 w-40"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                  </div>
                  
                  {errors.title && (
                    <p className="text-destructive text-sm">{errors.title}</p>
                  )}
               </div>
               
               <div className="min-h-[500px]">
                 <RichSermonEditor
                    markdown={content}
                    onChange={setContent}
                    placeholder={t('form.contentPlaceholder')}
                    className="w-full min-h-[500px]"
                  />
                  {errors.content && (
                    <p className="text-destructive text-sm mt-2">{errors.content}</p>
                  )}
               </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500 min-h-screen bg-white rounded-lg shadow-sm border p-8 md:p-12">
               <SermonPreview
                  title={title || 'Sin Título'}
                  content={content}
                  authorName={authorName}
                  date={new Date()}
                  bibleReferences={bibleReferences}
                  tags={tags}
                  category={category}
                  status={status}
                />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
