import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Pencil, Archive, Trash2, FileText, 
  BookOpen, MapPin, Clock, History, Plus,
  Share2, MoreVertical, Download, Globe, Eye, Check, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSermon, useDeleteSermon, usePublishSermon, useArchiveSermon } from '@/hooks/use-sermons';
import { useState, useEffect } from 'react';
import { exportService, sermonService, seriesService } from '@dosfilos/application';
import { SermonSeriesEntity, PreachingLog } from '@dosfilos/domain';
import { toast } from 'sonner';
import { SermonPreview } from '@/components/sermons/SermonPreview';

export function SermonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Validate ID - if it's a route param placeholder, redirect
  if (!id || id === ':id' || id.startsWith(':')) {
    navigate('/dashboard/sermons', { replace: true });
    return null;
  }

  const { sermon, loading, mutate } = useSermon(id);
  const { deleteSermon, loading: deleting } = useDeleteSermon();
  const { publishSermon, loading: publishing } = usePublishSermon();
  const { archiveSermon, loading: archiving } = useArchiveSermon();

  const [series, setSeries] = useState<SermonSeriesEntity | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Preaching Log State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logLocation, setLogLocation] = useState('');
  const [logDuration, setLogDuration] = useState('45');
  const [logNotes, setLogNotes] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (sermon?.seriesId) {
      loadSeries(sermon.seriesId);
    }
  }, [sermon?.seriesId]);

  const loadSeries = async (seriesId: string) => {
    try {
      const data = await seriesService.getSeries(seriesId);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteSermon(id);
    navigate('/dashboard/sermons');
  };

  const handlePublish = async () => {
    if (!id) return;
    await publishSermon(id);
    mutate();
  };

  const handleArchive = async () => {
    if (!id) return;
    await archiveSermon(id);
    mutate();
  };

  const handleExport = async () => {
    if (!sermon) return;
    try {
      setExporting(true);
      await exportService.exportSermonToPdf(sermon);
      toast.success('Sermón exportado correctamente');
    } catch (error) {
      console.error('Error exporting sermon:', error);
      toast.error('Error al exportar el sermón');
    } finally {
      setExporting(false);
    }
  };

  const handleShareToggle = async (checked: boolean) => {
    if (!id) return;
    try {
      setSharing(true);
      if (checked) {
        await sermonService.shareSermon(id);
        toast.success('Sermón compartido');
      } else {
        await sermonService.unshareSermon(id);
        toast.success('Sermón dejado de compartir');
      }
      mutate();
    } catch (error) {
      console.error('Error sharing sermon:', error);
      toast.error('Error al cambiar estado de compartir');
    } finally {
      setSharing(false);
    }
  };

  const handleLogPreaching = async () => {
    if (!sermon || !id) return;
    setLogging(true);
    try {
      const newLog: PreachingLog = {
        date: new Date(logDate),
        location: logLocation,
        durationMinutes: parseInt(logDuration) || 0,
        notes: logNotes
      };

      const updatedHistory = [...(sermon.preachingHistory || []), newLog];
      
      await sermonService.updateSermon(id, {
        preachingHistory: updatedHistory
      } as any);

      toast.success('Predicación registrada');
      setShowLogDialog(false);
      setLogLocation('');
      setLogNotes('');
      mutate();
    } catch (error) {
      console.error('Error logging preaching:', error);
      toast.error('Error al registrar predicación');
    } finally {
      setLogging(false);
    }
  };

  const copyToClipboard = () => {
    if (!sermon?.shareToken) return;
    const url = `${window.location.origin}/share/${sermon.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
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
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Sermón no encontrado</h2>
        <Button onClick={() => navigate('/dashboard/sermons')}>
          Volver a sermones
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      published: { variant: 'default', label: 'Publicado' },
      archived: { variant: 'outline', label: 'Archivado' },
    };
    const config = variants[status] || variants.draft;
    const safeConfig = config!;
    return (
      <Badge variant={safeConfig.variant} className="capitalize">
        {safeConfig.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-all duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/sermons')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Title in header - Only visible when scrolled */}
            <div className={`flex items-center gap-3 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <span className="font-semibold truncate max-w-[200px] sm:max-w-md">
                {sermon.title}
              </span>
              {getStatusBadge(sermon.status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowShareDialog(true)} 
              variant="ghost" 
              size="sm"
              className={sermon.isShared ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-muted-foreground hover:text-foreground"}
            >
              <Share2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>
            
            <Button onClick={() => navigate(`/dashboard/sermons/${id}/edit`)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Pencil className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <Button onClick={() => navigate(`/dashboard/sermons/${id}/preach`)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Predicar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExport} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </DropdownMenuItem>
                {sermon.isShared && (
                  <DropdownMenuItem onClick={() => window.open(`/share/${sermon.shareToken}`, '_blank')}>
                    <Globe className="mr-2 h-4 w-4" />
                    Ver Público
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {sermon.status === 'draft' && (
                  <DropdownMenuItem onClick={handlePublish} disabled={publishing}>
                    <Eye className="mr-2 h-4 w-4" />
                    Publicar
                  </DropdownMenuItem>
                )}
                {sermon.status === 'published' && (
                  <DropdownMenuItem onClick={handleArchive} disabled={archiving}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)} 
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <SermonPreview
            title={sermon.title}
            content={sermon.content}
            authorName={sermon.authorName}
            date={new Date(sermon.updatedAt || new Date())}
            bibleReferences={sermon.bibleReferences}
            tags={sermon.tags}
            category={sermon.category}
            status={sermon.status}
          />
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Series Card */}
          {series && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary font-medium">
                <BookOpen className="h-4 w-4" />
                <h3>Parte de la Serie</h3>
              </div>
              <div>
                <h4 className="font-bold text-lg cursor-pointer hover:underline" onClick={() => navigate(`/plans/${series.id}`)}>
                  {series.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {series.description}
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/plans/${series.id}`)}>
                Ver Serie Completa
              </Button>
            </Card>
          )}

          {/* Preaching History */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <History className="h-4 w-4" />
                <h3>Historial</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowLogDialog(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {(!sermon.preachingHistory || sermon.preachingHistory.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No hay registros de predicación.
                </p>
              ) : (
                sermon.preachingHistory.map((log, index) => (
                  <div key={index} className="text-sm border-l-2 border-muted pl-3 space-y-1">
                    <div className="font-medium flex items-center justify-between">
                      <span>{new Date(log.date || new Date()).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{log.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{log.location}</span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El sermón "{sermon.title}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir Sermón</DialogTitle>
            <DialogDescription>
              Genera un enlace público para compartir este sermón con otros.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
              <Label htmlFor="share-mode" className="flex flex-col space-y-1 cursor-pointer">
                <span className="font-medium">Compartir públicamente</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Cualquiera con el enlace podrá ver este sermón.
                </span>
              </Label>
              <Switch
                id="share-mode"
                checked={sermon.isShared}
                onCheckedChange={handleShareToggle}
                disabled={sharing}
              />
            </div>

            {sermon.isShared && sermon.shareToken && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Enlace público</Label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="link"
                      defaultValue={`${window.location.origin}/share/${sermon.shareToken}`}
                      readOnly
                      className="pr-10"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                      <Globe className="h-4 w-4" />
                    </div>
                  </div>
                  <Button size="icon" variant="outline" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este enlace permite ver el sermón sin necesidad de iniciar sesión.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Preaching Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Predicación</DialogTitle>
            <DialogDescription>
              Guarda un registro de cuándo y dónde predicaste este sermón.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="log-date">Fecha</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-duration">Duración (min)</Label>
                <div className="relative">
                  <Input
                    id="log-duration"
                    type="number"
                    value={logDuration}
                    onChange={(e) => setLogDuration(e.target.value)}
                    className="pl-8"
                  />
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-location">Lugar / Iglesia</Label>
              <div className="relative">
                <Input
                  id="log-location"
                  value={logLocation}
                  onChange={(e) => setLogLocation(e.target.value)}
                  placeholder="Ej: Iglesia Central"
                  className="pl-8"
                />
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-notes">Notas (Opcional)</Label>
              <Textarea
                id="log-notes"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Reacciones, puntos a mejorar, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancelar</Button>
            <Button onClick={handleLogPreaching} disabled={logging || !logLocation}>
              {logging ? 'Guardando...' : 'Guardar Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
