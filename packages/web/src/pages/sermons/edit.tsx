import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useSermon, useUpdateSermon } from '@/hooks/use-sermons';
import { StudySessionPanel } from '@/components/sermons/StudySessionPanel';
import { GraduationCap, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function SermonEditPage() {
  const { t } = useTranslation('sermonDetail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading: loadingSermon } = useSermon(id);
  const { updateSermon, loading: updating } = useUpdateSermon();

  // Panel is open by default when the sermon has a linked session
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const sessionId = sermon?.sourceFacultySessionId;

  const handleSubmit = async (data: SermonFormData) => {
    if (!id) return;
    try {
      await updateSermon(id, data);
      navigate(`/dashboard/sermons/${id}`);
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main editor area */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Toggle button – only rendered when a session is linked */}
        {sessionId && (
          <div className="flex justify-end px-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPanelOpen(prev => !prev)}
              className={cn(
                'gap-2 text-xs font-semibold transition-colors',
                isPanelOpen
                  ? 'border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  : 'text-muted-foreground'
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              {isPanelOpen ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  Ocultar sesión
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  Ver sesión de estudio
                </>
              )}
            </Button>
          </div>
        )}

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
        />
      </div>

      {/* Study session side panel – only rendered when linked and open */}
      {sessionId && isPanelOpen && (
        <div className="w-80 xl:w-96 shrink-0 h-full overflow-hidden">
          <StudySessionPanel
            sessionId={sessionId}
            onClose={() => setIsPanelOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
