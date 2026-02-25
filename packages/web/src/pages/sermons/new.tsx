import { useNavigate } from 'react-router-dom';
import { SermonForm, SermonFormData } from '@/components/sermons/sermon-form';
import { useCreateSermon } from '@/hooks/use-sermons';

export function SermonNewPage() {
  const navigate = useNavigate();
  const { createSermon, loading } = useCreateSermon();

  const handleSubmit = async (data: SermonFormData) => {
    try {
      const sermon = await createSermon(data);
      navigate(`/dashboard/sermons/${sermon.id}`);
    } catch (error) {
      // Error already handled by hook with toast
    }
  };

  return (
    <div className="h-full">
      <SermonForm
        onSubmit={handleSubmit}
        submitLabel="Crear Sermón"
        loading={loading}
        onBack={() => navigate('/dashboard/sermons')}
      />
    </div>
  );
}
