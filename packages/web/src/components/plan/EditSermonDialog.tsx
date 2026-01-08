import { useState, useEffect } from 'react';
import { PlannedSermon, SermonSeriesEntity } from '@dosfilos/domain';
import { seriesService } from '@dosfilos/application';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EditSermonDialogProps {
  series: SermonSeriesEntity;
  sermon: PlannedSermon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSermonUpdated: () => void;
}

export function EditSermonDialog({ 
  series, 
  sermon, 
  open, 
  onOpenChange, 
  onSermonUpdated 
}: EditSermonDialogProps) {
  const [saving, setSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passage, setPassage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    if (sermon) {
      setTitle(sermon.title);
      setDescription(sermon.description || '');
      setPassage(sermon.passage || '');
      setScheduledDate(sermon.scheduledDate ? new Date(sermon.scheduledDate).toISOString().split('T')[0] : '');
    }
  }, [sermon]);

  const handleSave = async () => {
    if (!sermon || !title.trim()) return;
    
    setSaving(true);
    try {
      const plannedSermons = series.metadata?.plannedSermons || [];
      const updatedSermons = plannedSermons.map(s => 
        s.id === sermon.id 
          ? { 
              ...s, 
              title: title.trim(),
              description: description.trim(),
              passage: passage.trim(),
              scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
            }
          : s
      );

      await seriesService.updateSeries(series.id, {
        metadata: {
          ...series.metadata,
          plannedSermons: updatedSermons
        }
      } as any);

      toast.success('Sermón actualizado');
      onSermonUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sermon:', error);
      toast.error('Error al actualizar sermón');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Detalles del Sermón</DialogTitle>
          <DialogDescription>
            Modifica el título, pasaje y otros detalles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input 
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del sermón"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-passage">Pasaje Bíblico</Label>
            <Input 
              id="edit-passage"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Ej: Romanos 8:28-39"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea 
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-date">Fecha Programada</Label>
            <Input 
              id="edit-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
