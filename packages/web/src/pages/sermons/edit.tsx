import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useSermon, useUpdateSermon } from '@/hooks/use-sermons';
import { SermonTutorPanel } from '@/components/sermons/tutor/SermonTutorPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useDefaultLayout } from 'react-resizable-panels';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function SermonEditPage() {
  const { t } = useTranslation('sermonDetail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading: loadingSermon } = useSermon(id);
  const { updateSermon, loading: updating } = useUpdateSermon();

  // The tutor panel is available for every sermon. It auto-opens once for
  // sermons that already carry a study conversation (origin or a previous
  // editor session); for the rest it stays closed until the pastor opens it.
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (autoOpenedRef.current || !sermon) return;
    autoOpenedRef.current = true;
    if (sermon.sourceFacultySessionId || sermon.tutorSessionId) setIsPanelOpen(true);
  }, [sermon]);

  // Persist the editor/tutor split width across sessions via localStorage.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'sermon-editor-tutor',
    panelIds: ['editor', 'tutor'],
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  });

  const handleSubmit = async (data: SermonFormData) => {
    if (!id) return;
    try {
      await updateSermon(id, data);
      // Removed navigation to stay in edit mode after saving
    } catch {
      // Error already handled by hook with toast
    }
  };

  if (loadingSermon) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h2 className="text-2xl font-semibold">{t('notFound.title')}</h2>
        <Button onClick={() => navigate('/dashboard/sermons')}>
          {t('notFound.button')}
        </Button>
      </div>
    );
  }

  const tutorToggle = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsPanelOpen(prev => !prev)}
      className={cn(
        'gap-2 text-xs font-semibold transition-colors h-8',
        isPanelOpen
          ? 'border-info/40 text-info hover:bg-info/10'
          : 'text-muted-foreground'
      )}
      title={isPanelOpen ? t('tutorPanel.toggleClose') : t('tutorPanel.toggleOpen')}
    >
      <GraduationCap className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">
        {isPanelOpen ? t('tutorPanel.toggleClose') : t('tutorPanel.toggleOpen')}
      </span>
    </Button>
  );

  const formNode = (
    <SermonForm
      defaultValues={{
        title: sermon.title,
        category: sermon.category,
        content: sermon.content,
        bibleReferences: sermon.bibleReferences,
        tags: sermon.tags,
        authorName: sermon.authorName,
        status: sermon.status,
      }}
      onSubmit={handleSubmit}
      submitLabel={t('form.save')}
      loading={updating}
      onBack={() => navigate(`/dashboard/sermons/${id}`)}
      headerActions={tutorToggle}
    />
  );

  return (
    <div className="flex h-full overflow-hidden">
      {isPanelOpen ? (
        // Resizable split: drag the handle to size the tutor panel. The chosen
        // width is saved to localStorage and restored on the next visit.
        <ResizablePanelGroup
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className="h-full w-full"
        >
          <ResizablePanel id="editor" defaultSize={68} minSize={40}>
            <div className="h-full overflow-y-auto">{formNode}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="tutor" defaultSize={32} minSize={22}>
            <div className="h-full overflow-hidden">
              <SermonTutorPanel sermon={sermon} onClose={() => setIsPanelOpen(false)} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 min-w-0 overflow-y-auto">{formNode}</div>
      )}
    </div>
  );
}
