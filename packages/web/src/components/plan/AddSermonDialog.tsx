import { useState } from 'react';
import { PlannedSermon, SermonSeriesEntity } from '@dosfilos/domain';
import { seriesService } from '@dosfilos/application';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface AddSermonDialogProps {
  series: SermonSeriesEntity;
  onSermonAdded: () => void;
}

export function AddSermonDialog({ series, onSermonAdded }: AddSermonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // New planned sermon state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passage, setPassage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const handleAddPlanned = async () => {
    if (!title.trim() || !passage.trim()) return;
    
    setAdding(true);
    try {
      const plannedSermons = series.metadata?.plannedSermons || [];
      const newPlanned: PlannedSermon = {
        id: crypto.randomUUID(),
        week: plannedSermons.length + 1,
        title: title.trim(),
        description: description.trim(),
        passage: passage.trim(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
      };

      await seriesService.updateSeries(series.id, {
        metadata: {
          ...series.metadata,
          plannedSermons: [...plannedSermons, newPlanned]
        }
      } as any);

      // Reset form
      setTitle('');
      setDescription('');
      setPassage('');
      setScheduledDate('');
      setIsOpen(false);
      
      toast.success('Sermón agregado al plan');
      onSermonAdded();
    } catch (error) {
      console.error('Error adding planned sermon:', error);
      toast.error('Error al agregar sermón');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Sermón
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Sermón al Plan</DialogTitle>
          <DialogDescription>
            Planifica un nuevo sermón para esta serie
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input 
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: La Gracia de Dios"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passage">Pasaje Bíblico *</Label>
            <Input 
              id="passage"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Ej: Romanos 8:28-39"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del sermón..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Fecha Programada</Label>
            <Input 
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAddPlanned} 
            disabled={!title.trim() || !passage.trim() || adding}
          >
            {adding ? 'Agregando...' : 'Agregar Sermón'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
