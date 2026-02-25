import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useSermon, useUpdateSermon } from '@/hooks/use-sermons';

import { useTranslation } from 'react-i18next';

export function SermonEditPage() {
  const { t } = useTranslation('sermonDetail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading: loadingSermon } = useSermon(id);
  const { updateSermon, loading: updating } = useUpdateSermon();

  const handleSubmit = async (data: SermonFormData) => {
    if (!id) return;
    
    try {
      await updateSermon(id, data);
      navigate(`/dashboard/sermons/${id}`);
    } catch (error) {
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
    <div className="h-full">
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
  );
}
