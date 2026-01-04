import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { seriesService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeRequiredModal } from '@/components/upgrade';

interface SeriesFormData {
  title: string;
  description: string;
  coverUrl: string;
  startDate: string;
  endDate: string;
}

export function SeriesForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { checkCanCreatePreachingPlan } = useUsageLimits();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  
  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState({
    reason: 'limit_reached' as const,
    limitType: 'plans' as const,
    currentLimit: 1
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SeriesFormData>();

  useEffect(() => {
    if (id) {
      loadSeries();
    }
  }, [id]);

  const loadSeries = async () => {
    try {
      if (!id) return;
      const series = await seriesService.getSeries(id);
      if (series) {
        reset({
          title: series.title,
          description: series.description,
          coverUrl: series.coverUrl || '',
          startDate: new Date(series.startDate).toISOString().split('T')[0],
          endDate: series.endDate ? new Date(series.endDate).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Error loading series:', error);
      toast.error('Error al cargar la serie');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: SeriesFormData) => {
    if (!user) return;
    
    // Show loading immediately when user clicks submit
    setLoading(true);
    
    try {
      // Check limits only for NEW plans (not when editing)
      if (!id) {
        const check = await checkCanCreatePreachingPlan();
        
        if (!check.allowed) {
          setLoading(false); // Hide loading before showing modal
          setUpgradeReason({
            reason: 'limit_reached',
            limitType: 'plans',
            currentLimit: check.limit || 1
          });
          setShowUpgradeModal(true);
          return;
        }
      }
      
      const payload = {
        title: data.title,
        description: data.description,
        coverUrl: data.coverUrl,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      if (id) {
        await seriesService.updateSeries(id, payload as any); // Cast to any because updateSeries expects Partial<...> but types might mismatch slightly on Date vs string
        toast.success('Plan actualizado correctamente');
        navigate(`/dashboard/plans/${id}`); // Volver al plan específico
      } else {
        const newSeries = await seriesService.createSeries({
          userId: user.uid,
          ...payload
        });
        toast.success('Plan creado correctamente');
        navigate(`/dashboard/plans/${newSeries.id}`); // Ir al plan recién creado
      }
    } catch (error) {
      console.error('Error saving series:', error);
      toast.error('Error al guardar el plan');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(id ? `/dashboard/plans/${id}` : '/dashboard/plans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {id ? 'Editar Plan' : 'Nuevo Plan'}
        </h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register('title', { required: 'El título es requerido', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })}
              placeholder="Ej: El Sermón del Monte"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Breve descripción de la serie..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Fecha de inicio requerida' })}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin (Opcional)</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverUrl">URL de Portada (Opcional)</Label>
            <Input
              id="coverUrl"
              {...register('coverUrl')}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Enlace a una imagen para la portada de la serie.
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate(id ? `/dashboard/plans/${id}` : '/dashboard/plans')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {id ? 'Actualizar' : 'Crear Serie'}
            </Button>
          </div>
        </form>
      </Card>
      
      {/* Upgrade Required Modal */}
      <UpgradeRequiredModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason={upgradeReason.reason}
        limitType={upgradeReason.limitType}
        currentLimit={upgradeReason.currentLimit}
      />
    </div>
  );
}
