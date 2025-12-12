import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Trash2, Wand2, CalendarDays, FileText } from 'lucide-react';
import { SermonSeriesEntity, SermonEntity, PlannedSermon } from '@dosfilos/domain';
import { seriesService, sermonService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';

// Unified sermon item (can be planned, in progress, or complete)
interface SermonItem {
  id: string;
  title: string;
  description: string;
  passage?: string;          // Biblical passage for this sermon
  scheduledDate?: Date;
  status: 'planned' | 'in_progress' | 'complete';
  plannedSermonId?: string;  // Reference to planned sermon if applicable
  draftId?: string;          // Reference to actual draft if started
  wizardProgress?: { currentStep: number };
}

export function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useFirebase();
  const [series, setSeries] = useState<SermonSeriesEntity | null>(null);
  const [sermonItems, setSermonItems] = useState<SermonItem[]>([]);
  const [availableSermons, setAvailableSermons] = useState<SermonEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingDraft, setStartingDraft] = useState<string | null>(null);
  
  // Add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSermonId, setSelectedSermonId] = useState<string>('');
  const [addingSermon, setAddingSermon] = useState(false);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftDescription, setNewDraftDescription] = useState('');
  const [newDraftDate, setNewDraftDate] = useState('');
  
  // Reschedule dialog state
  const [rescheduleItem, setRescheduleItem] = useState<SermonItem | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      if (!id) return;
      const seriesData = await seriesService.getSeries(id);
      if (!seriesData) {
        navigate('/series');
        return;
      }
      setSeries(seriesData);

      const items: SermonItem[] = [];

      // 1. Load planned sermons from metadata
      const plannedSermons = seriesData.metadata?.plannedSermons || [];
      for (const planned of plannedSermons) {
        // Check if this planned sermon has been started (has a draftId)
        if (planned.draftId) {
          // Load the actual draft to get current status
          const draft = await sermonService.getSermon(planned.draftId);
          if (draft) {
            const isComplete = draft.content && draft.content.length > 100 && 
                              (!draft.wizardProgress || draft.wizardProgress.currentStep >= 4);
            items.push({
              id: planned.id,
              title: planned.title,
              description: planned.description,
              scheduledDate: planned.scheduledDate,
              status: isComplete ? 'complete' : 'in_progress',
              plannedSermonId: planned.id,
              draftId: planned.draftId,
              wizardProgress: draft.wizardProgress
            });
          } else {
            // Draft not found, show as planned
            items.push({
              id: planned.id,
              title: planned.title,
              description: planned.description,
              scheduledDate: planned.scheduledDate,
              status: 'planned',
              plannedSermonId: planned.id
            });
          }
        } else {
          // Not started yet
          items.push({
            id: planned.id,
            title: planned.title,
            description: planned.description,
            passage: planned.passage,
            scheduledDate: planned.scheduledDate,
            status: 'planned',
            plannedSermonId: planned.id
          });
        }
      }

      // 2. Load any additional drafts (draftIds that aren't linked to plannedSermons)
      const linkedDraftIds = new Set(plannedSermons.map(p => p.draftId).filter(Boolean));
      for (const draftId of (seriesData.draftIds || [])) {
        if (!linkedDraftIds.has(draftId)) {
          const draft = await sermonService.getSermon(draftId);
          if (draft) {
            items.push({
              id: draft.id,
              title: draft.title,
              description: draft.content || '',
              scheduledDate: draft.scheduledDate,
              status: 'in_progress',
              draftId: draft.id,
              wizardProgress: draft.wizardProgress
            });
          }
        }
      }

      // 3. Load completed sermons
      for (const sermonId of seriesData.sermonIds) {
        const sermon = await sermonService.getSermon(sermonId);
        if (sermon) {
          items.push({
            id: sermon.id,
            title: sermon.title,
            description: sermon.content?.substring(0, 200) || '',
            scheduledDate: sermon.scheduledDate,
            status: 'complete',
            draftId: sermon.id
          });
        }
      }

      // Sort by scheduledDate
      items.sort((a, b) => {
        if (a.scheduledDate && b.scheduledDate) {
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        }
        if (a.scheduledDate) return -1;
        if (b.scheduledDate) return 1;
        return 0;
      });

      setSermonItems(items);

      // Load available sermons for adding existing ones
      const allUserSermons = await sermonService.getUserSermons(seriesData.userId);
      const existingIds = new Set([...seriesData.sermonIds, ...(seriesData.draftIds || [])]);
      setAvailableSermons(allUserSermons.filter(s => !existingIds.has(s.id)));

    } catch (error) {
      console.error('Error loading series details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDeveloping = async (item: SermonItem) => {
    console.log('🚀 handleStartDeveloping called');
    console.log('📌 item:', item);
    console.log('📌 series:', series);
    console.log('📌 user:', user);
    
    if (!series || !item.plannedSermonId || !user) {
      console.error('❌ Missing required data:', { series: !!series, plannedSermonId: item.plannedSermonId, user: !!user });
      return;
    }
    
    setStartingDraft(item.id);
    try {
      const sermonData = {
        userId: user.uid,
        title: item.title,
        content: item.description,
        status: 'draft' as const,
        tags: [series.title],
        seriesId: series.id,
        scheduledDate: item.scheduledDate,
        wizardProgress: {
          currentStep: item.passage ? 1 : 0,  // Skip to exegesis if passage exists
          passage: item.passage || '',
          lastSaved: new Date()
        }
      };
      
      console.log('📝 Creating sermon with data:', sermonData);
      
      // Create a new draft sermon using CURRENT user's uid
      const newSermon = await sermonService.createSermon(sermonData);
      
      console.log('✅ Sermon created successfully:', newSermon);

      // Update the planned sermon with the draftId
      const plannedSermons = series.metadata?.plannedSermons || [];
      const updatedPlanned = plannedSermons.map(p => 
        p.id === item.plannedSermonId 
          ? { ...p, draftId: newSermon.id }
          : p
      );
      
      console.log('📝 Updating series with new draftId...');
      
      // Update series with new draftId and updated metadata
      const newDraftIds = [...(series.draftIds || []), newSermon.id];
      await seriesService.updateSeries(series.id, {
        draftIds: newDraftIds,
        metadata: {
          ...series.metadata,
          plannedSermons: updatedPlanned
        }
      } as any);

      console.log('✅ Series updated successfully');
      toast.success('Sermón iniciado');
      
      // Navigate to generator with the new draft
      navigate(`/sermons/generate?id=${newSermon.id}`);
    } catch (error: any) {
      console.error('❌ Error starting draft:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      toast.error('Error al iniciar sermón');
    } finally {
      setStartingDraft(null);
    }
  };

  const handleContinueEditing = (draftId: string) => {
    navigate(`/sermons/generate?id=${draftId}`);
  };

  const handleViewSermon = (sermonId: string) => {
    navigate(`/sermons/${sermonId}`);
  };

  const handleAddNewPlanned = async () => {
    if (!series || !newDraftTitle.trim()) return;
    setAddingSermon(true);
    try {
      const plannedSermons = series.metadata?.plannedSermons || [];
      const newPlanned: PlannedSermon = {
        id: crypto.randomUUID(),
        week: plannedSermons.length + 1,
        title: newDraftTitle.trim(),
        description: newDraftDescription.trim(),
        scheduledDate: newDraftDate ? new Date(newDraftDate) : undefined
      };

      await seriesService.updateSeries(series.id, {
        metadata: {
          ...series.metadata,
          plannedSermons: [...plannedSermons, newPlanned]
        }
      } as any);

      await loadData();
      setNewDraftTitle('');
      setNewDraftDescription('');
      setNewDraftDate('');
      setIsAddDialogOpen(false);
      toast.success('Sermón planificado agregado');
    } catch (error) {
      console.error('Error adding planned sermon:', error);
      toast.error('Error al agregar sermón');
    } finally {
      setAddingSermon(false);
    }
  };

  const handleAddExistingSermon = async () => {
    if (!series || !selectedSermonId) return;
    setAddingSermon(true);
    try {
      await seriesService.addSermonToSeries(series.id, selectedSermonId);
      await sermonService.updateSermon(selectedSermonId, { seriesId: series.id });
      await loadData();
      setSelectedSermonId('');
      setIsAddDialogOpen(false);
      toast.success('Sermón agregado');
    } catch (error) {
      console.error('Error adding sermon:', error);
      toast.error('Error al agregar');
    } finally {
      setAddingSermon(false);
    }
  };

  const handleRemoveItem = async (item: SermonItem) => {
    if (!series) return;
    try {
      if (item.plannedSermonId && item.status === 'planned') {
        // Remove from plannedSermons
        const plannedSermons = series.metadata?.plannedSermons || [];
        const updated = plannedSermons.filter(p => p.id !== item.plannedSermonId);
        await seriesService.updateSeries(series.id, {
          metadata: { ...series.metadata, plannedSermons: updated }
        } as any);
      } else if (item.draftId) {
        // Remove from draftIds or sermonIds
        if (series.draftIds?.includes(item.draftId)) {
          const newDraftIds = series.draftIds.filter(id => id !== item.draftId);
          await seriesService.updateSeries(series.id, { draftIds: newDraftIds } as any);
        } else {
          await seriesService.removeSermonFromSeries(series.id, item.draftId);
        }
        await sermonService.updateSermon(item.draftId, { seriesId: undefined });
      }
      await loadData();
      toast.success('Sermón removido de la serie');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error al remover');
    }
  };

  const handleReschedule = async () => {
    if (!series || !rescheduleItem || !newDate) return;
    try {
      if (rescheduleItem.plannedSermonId) {
        // Update planned sermon date
        const plannedSermons = series.metadata?.plannedSermons || [];
        const updated = plannedSermons.map(p => 
          p.id === rescheduleItem.plannedSermonId
            ? { ...p, scheduledDate: new Date(newDate) }
            : p
        );
        await seriesService.updateSeries(series.id, {
          metadata: { ...series.metadata, plannedSermons: updated }
        } as any);
      }
      if (rescheduleItem.draftId) {
        await sermonService.updateSermon(rescheduleItem.draftId, {
          scheduledDate: new Date(newDate)
        });
      }
      await loadData();
      setIsRescheduleOpen(false);
      setRescheduleItem(null);
      setNewDate('');
      toast.success('Fecha actualizada');
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Error al reprogramar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!series) return null;

  const plannedCount = sermonItems.filter(s => s.status === 'planned').length;
  const inProgressCount = sermonItems.filter(s => s.status === 'in_progress').length;
  const completedCount = sermonItems.filter(s => s.status === 'complete').length;

  const getStatusBadge = (status: SermonItem['status']) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline" className="border-slate-400 text-slate-600 text-xs">Planificado</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">En Desarrollo</Badge>;
      case 'complete':
        return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Listo</Badge>;
    }
  };

  const getStatusColor = (status: SermonItem['status']) => {
    switch (status) {
      case 'planned': return 'border-l-slate-400';
      case 'in_progress': return 'border-l-amber-500';
      case 'complete': return 'border-l-green-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" className="pl-0" onClick={() => navigate('/series')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Series
        </Button>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {series.coverUrl && (
            <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shadow-md shrink-0">
              <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold font-serif">{series.title}</h1>
            <p className="text-muted-foreground text-lg">{series.description}</p>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(series.startDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <Badge variant="secondary">{sermonItems.length} sermones</Badge>
              {plannedCount > 0 && (
                <Badge variant="outline" className="border-slate-400 text-slate-600">
                  {plannedCount} planificados
                </Badge>
              )}
              {inProgressCount > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  {inProgressCount} en desarrollo
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  {completedCount} listos
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={() => navigate(`/series/${series.id}/edit`)}>
            Editar Serie
          </Button>
        </div>
      </div>

      {/* Sermons List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sermones</h2>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar Sermón</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="new" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">Planificar Nuevo</TabsTrigger>
                  <TabsTrigger value="existing">Agregar Existente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="new" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input 
                      id="title"
                      value={newDraftTitle}
                      onChange={(e) => setNewDraftTitle(e.target.value)}
                      placeholder="Ej: La Gracia de Dios"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea 
                      id="description"
                      value={newDraftDescription}
                      onChange={(e) => setNewDraftDescription(e.target.value)}
                      placeholder="Breve descripción..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha Programada</Label>
                    <Input 
                      id="date"
                      type="date"
                      value={newDraftDate}
                      onChange={(e) => setNewDraftDate(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddNewPlanned} disabled={!newDraftTitle.trim() || addingSermon}>
                      {addingSermon ? 'Agregando...' : 'Agregar'}
                    </Button>
                  </DialogFooter>
                </TabsContent>
                
                <TabsContent value="existing" className="space-y-4 mt-4">
                  {availableSermons.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No hay sermones disponibles.
                    </p>
                  ) : (
                    <>
                      <Select value={selectedSermonId} onValueChange={setSelectedSermonId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSermons.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DialogFooter>
                        <Button onClick={handleAddExistingSermon} disabled={!selectedSermonId || addingSermon}>
                          {addingSermon ? 'Agregando...' : 'Agregar'}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {sermonItems.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              No hay sermones planificados todavía.
            </Card>
          ) : (
            sermonItems.map((item, index) => (
              <Card 
                key={item.id} 
                className={`p-4 flex items-center gap-4 group transition-all hover:shadow-md border-l-4 ${getStatusColor(item.status)}`}
              >
                <div className="text-muted-foreground font-mono text-sm w-8 text-center shrink-0">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {item.scheduledDate ? (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(item.scheduledDate).toLocaleDateString('es-ES', { 
                          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <CalendarDays className="h-3 w-3" />
                        Sin fecha
                      </span>
                    )}
                    {item.status === 'in_progress' && item.wizardProgress && (
                      <span className="text-amber-600">• Paso {item.wizardProgress.currentStep}/4</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {item.status === 'planned' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartDeveloping(item)}
                      disabled={startingDraft === item.id}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      {startingDraft === item.id ? 'Iniciando...' : 'Desarrollar'}
                    </Button>
                  )}
                  {item.status === 'in_progress' && item.draftId && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleContinueEditing(item.draftId!)}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Continuar
                    </Button>
                  )}
                  {item.status === 'complete' && item.draftId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSermon(item.draftId!)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  )}
                  
                  <Dialog open={isRescheduleOpen && rescheduleItem?.id === item.id} onOpenChange={(open) => {
                    setIsRescheduleOpen(open);
                    if (!open) { setRescheduleItem(null); setNewDate(''); }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setRescheduleItem(item);
                        setNewDate(item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : '');
                        setIsRescheduleOpen(true);
                      }}>
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reprogramar</DialogTitle>
                        <DialogDescription>Nueva fecha para "{item.title}"</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleReschedule} disabled={!newDate}>Guardar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Remover de la serie?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{item.title}" será removido de esta serie.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveItem(item)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
