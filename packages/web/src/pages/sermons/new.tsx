import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useCreateSermon } from '@/hooks/use-sermons';

export function SermonNewPage() {
  const navigate = useNavigate();
  const { createSermon, loading } = useCreateSermon();

  const handleSubmit = async (data: SermonFormData) => {
    try {
      const sermon = await createSermon(data);
      navigate(`/sermons/${sermon.id}`);
    } catch (error) {
      // Error already handled by hook with toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/sermons')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Sermón</h1>
          <p className="text-muted-foreground">
            Crea un nuevo sermón para tu ministerio
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <SermonForm
          onSubmit={handleSubmit}
          submitLabel="Crear Sermón"
          loading={loading}
        />
      </Card>
    </div>
  );
}
