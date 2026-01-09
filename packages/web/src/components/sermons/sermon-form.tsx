import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SermonPreview } from './SermonPreview';
import { SermonMetadataPanel } from './SermonMetadataPanel';
import { RichSermonEditor } from '@/components/ui/RichSermonEditor';
import { PanelRightClose, PanelRightOpen, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Form State
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [category, setCategory] = useState(defaultValues?.category || '');
  const [content, setContent] = useState(defaultValues?.content || '');
  const [bibleReferences, setBibleReferences] = useState<string[]>(defaultValues?.bibleReferences || []);
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [authorName, setAuthorName] = useState(defaultValues?.authorName || '');
  const [status, setStatus] = useState<'working' | 'draft' | 'published' | 'archived'>(defaultValues?.status || 'draft');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    <div className="flex h-[calc(100vh-180px)] min-h-[600px] border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} title="Mostrar detalles">
                <PanelRightOpen className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Editor</h2>
          </div>
          
          <Button onClick={() => handleSubmit()} disabled={loading} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? t('form.saving') : resolvedSubmitLabel}
          </Button>
        </div>

        <Tabs defaultValue="write" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 border-b">
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="write" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Escribir
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Previsualizar
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="write" className="flex-1 mt-0 p-0 overflow-y-auto relative">
            <RichSermonEditor
              markdown={content}
              onChange={setContent}
              placeholder={t('form.contentPlaceholder')}
              className="w-full min-h-full"
            />
             {errors.content && (
              <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 text-destructive px-4 py-2 rounded border border-destructive/20 text-sm z-10 w-auto inline-block">
                {errors.content}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden bg-muted/5">
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto bg-background shadow-sm rounded-lg min-h-full">
                <SermonPreview
                  title={title || 'Título del Sermón'}
                  content={content}
                  authorName={authorName}
                  date={new Date()}
                  bibleReferences={bibleReferences}
                  tags={tags}
                  category={category}
                  status={status}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar - Metadata Panel */}
      <div 
        className={cn(
          "w-80 flex-shrink-0 transition-all duration-300 ease-in-out border-l bg-muted/10 relative",
          !isSidebarOpen && "w-0 overflow-hidden border-l-0"
        )}
      >
        <div className="absolute top-2 right-2 z-10">
           <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} title="Ocultar detalles">
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <div className={cn("w-80 h-full", !isSidebarOpen && "hidden")}>
          <SermonMetadataPanel
            title={title}
            setTitle={setTitle}
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
            errors={errors}
            onSubmit={() => handleSubmit()}
            submitLabel={resolvedSubmitLabel}
          />
        </div>
      </div>
    </div>
  );
}
