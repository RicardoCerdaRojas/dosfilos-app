import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useSermon, useUpdateSermon } from '@/hooks/use-sermons';

export function SermonEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading: loadingSermon } = useSermon(id);
  const { updateSermon, loading: updating } = useUpdateSermon();

  const handleSubmit = async (data: SermonFormData) => {
    if (!id) return;
    
    try {
      await updateSermon(id, data);
      navigate(`/sermons/${id}`);
    } catch (error) {
      // Error already handled by hook with toast
    }
  };

  if (loadingSermon) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando sermón...</p>
        </div>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h2 className="text-2xl font-semibold">Sermón no encontrado</h2>
        <Button onClick={() => navigate('/sermons')}>
          Volver a sermones
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/sermons/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Sermón</h1>
          <p className="text-muted-foreground">{sermon.title}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <SermonForm
          defaultValues={{
            title: sermon.title,
            category: sermon.category,
            content: sermon.content,
            bibleReferences: sermon.bibleReferences,
            tags: sermon.tags,
            status: sermon.status,
          }}
          onSubmit={handleSubmit}
          submitLabel="Guardar Cambios"
          loading={updating}
        />
      </Card>
    </div>
  );
}
