import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Pencil, Archive, Trash2, FileText, 
  Download, Share2, Copy, Check, MoreVertical, Globe, Eye, BookOpen,
  Minus, Plus, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSermon, useDeleteSermon, usePublishSermon, useArchiveSermon } from '@/hooks/use-sermons';
import { useState, useEffect } from 'react';
import { exportService, sermonService } from '@dosfilos/application';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { LocalBibleService } from '@/services/LocalBibleService';

export function SermonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading } = useSermon(id);
  const { deleteSermon, loading: deleting } = useDeleteSermon();
  const { publishSermon, loading: publishing } = usePublishSermon();
  const { archiveSermon, loading: archiving } = useArchiveSermon();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Default font size for reading

  // Bible Viewer State
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [loadingBible, setLoadingBible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bible Fetching Logic
  const fetchBibleText = async (ref: string) => {
    setLoadingBible(true);
    setBibleText(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const text = LocalBibleService.getVerses(ref);
      if (text) {
        setBibleText(text);
      } else {
        setBibleText('No se pudo encontrar el texto. Verifique la referencia.');
      }
    } catch (error) {
      console.error('Error fetching bible text:', error);
      setBibleText('Error al cargar el texto bíblico.');
    } finally {
      setLoadingBible(false);
    }
  };

  useEffect(() => {
    if (selectedReference) {
      fetchBibleText(selectedReference);
    }
  }, [selectedReference]);

  // Markdown Processing for Bible Links
  const processContent = (content: string) => {
    const bibleRegex = /\b((?:[1-3]\s)?[A-Z][a-zá-ú]+\s\d+:\d+(?:-\d+)?)\b/g;
    return content.replace(bibleRegex, (match) => `[${match}](#bible-${encodeURIComponent(match)})`);
  };

  const components = {
    a: ({ node, ...props }: any) => {
      const href = props.href || '';
      if (href.startsWith('#bible-')) {
        const ref = decodeURIComponent(href.replace('#bible-', ''));
        return (
          <span 
            className="text-primary font-semibold cursor-pointer hover:underline decoration-dotted underline-offset-4"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedReference(ref);
            }}
          >
            {props.children}
          </span>
        );
      }
      return <a {...props} className="text-blue-500 underline" />;
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteSermon(id);
    navigate('/sermons');
  };

  const handlePublish = async () => {
    if (!id) return;
    await publishSermon(id);
    window.location.reload();
  };

  const handleArchive = async () => {
    if (!id) return;
    await archiveSermon(id);
    window.location.reload();
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
      window.location.reload();
    } catch (error) {
      console.error('Error sharing sermon:', error);
      toast.error('Error al cambiar estado de compartir');
    } finally {
      setSharing(false);
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
        <Button onClick={() => navigate('/sermons')}>
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
    <div className="min-h-screen bg-background">
      {/* Header Toolbar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-all duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/sermons')}
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
            {/* Font Size Controls */}
            <div className="hidden sm:flex items-center gap-1 mr-2 bg-muted/30 rounded-full px-2 py-1 border">
              <Type className="h-3 w-3 text-muted-foreground ml-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFontSize(s => Math.max(14, s - 1))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs w-6 text-center tabular-nums">{fontSize}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFontSize(s => Math.min(24, s + 1))}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button 
              onClick={() => setShowShareDialog(true)} 
              variant="ghost" 
              size="sm"
              className={sermon.isShared ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-muted-foreground hover:text-foreground"}
            >
              <Share2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>
            
            <Button onClick={() => navigate(`/sermons/${id}/edit`)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Pencil className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <Button onClick={() => navigate(`/sermons/${id}/preach`)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
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

      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Document Header */}
        <div className="text-center space-y-8 pb-8 border-b">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
              <span>{new Date(sermon.updatedAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}</span>
              <span className="text-border">•</span>
              <span>{sermon.authorName || 'Pastor'}</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight font-serif text-foreground leading-tight">
              {sermon.title}
            </h1>
            {!isScrolled && (
              <div className="flex justify-center pt-2">
                {getStatusBadge(sermon.status)}
              </div>
            )}
          </div>
          
          {/* Bible References - Improved Styling */}
          {sermon.bibleReferences.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {sermon.bibleReferences.map((ref, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setSelectedReference(ref)}
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  {ref}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div 
          className="prose prose-lg max-w-none dark:prose-invert sermon-content transition-all duration-200"
          style={{ fontSize: `${fontSize}px` }}
        >
          <ReactMarkdown components={components}>
            {processContent(sermon.content)}
          </ReactMarkdown>
        </div>

        {/* Footer Info - Tags Moved Here */}
        {(sermon.tags.length > 0 || sermon.category) && (
          <div className="pt-8 border-t">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Etiquetas y Categoría
              </h3>
              <div className="flex flex-wrap gap-2">
                {sermon.category && (
                  <Badge variant="outline" className="text-sm py-1 px-3 border-primary/20 bg-primary/5">
                    {sermon.category}
                  </Badge>
                )}
                {sermon.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
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

      {/* Bible Verse Dialog */}
      <Dialog open={!!selectedReference} onOpenChange={(open) => !open && setSelectedReference(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedReference}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 min-h-[100px]">
            {loadingBible ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-lg leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                {bibleText}
              </div>
            )}
            <div className="mt-4 text-xs text-muted-foreground text-right">
              Fuente: Reina Valera 1960
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
