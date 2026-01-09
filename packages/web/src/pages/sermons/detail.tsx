import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Pencil, Archive, Trash2, FileText, 
  BookOpen, MapPin, Clock, History, Plus,
  Share2, MoreVertical, Download, Globe, Eye, Check, Copy, CheckCircle
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
import { useTranslation } from 'react-i18next';

export function SermonDetailPage() {
  const { t } = useTranslation('sermonDetail');
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
  const [markingComplete, setMarkingComplete] = useState(false);

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
      toast.success(t('toast.exportSuccess'));
    } catch (error) {
      console.error('Error exporting sermon:', error);
      toast.error(t('toast.exportError'));
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
        toast.success(t('toast.shared'));
      } else {
        await sermonService.unshareSermon(id);
        toast.success(t('toast.unshared'));
      }
      mutate();
    } catch (error) {
      console.error('Error sharing sermon:', error);
      toast.error(t('toast.shareError'));
    } finally {
      setSharing(false);
    }
  };

  const handleLogPreaching = async () => {
    if (!sermon || !id) return;
    setLogging(true);
    try {
      const newLog: PreachingLog = {
        date: new Date(logDate || new Date().toISOString()),
        location: logLocation,
        durationMinutes: parseInt(logDuration) || 0,
        notes: logNotes
      };

      const updatedHistory = [...(sermon.preachingHistory || []), newLog];
      
      await sermonService.updateSermon(id, {
        preachingHistory: updatedHistory
      } as any);

      toast.success(t('toast.logSuccess'));
      setShowLogDialog(false);
      setLogLocation('');
      setLogNotes('');
      mutate();
    } catch (error) {
      console.error('Error logging preaching:', error);
      toast.error(t('toast.logError'));
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
    toast.success(t('toast.copied'));
  };

  const handleMarkComplete = async () => {
    if (!id || !sermon) return;
    setMarkingComplete(true);
    try {
      await sermonService.updateSermon(id, {
        wizardProgress: {
          currentStep: 4,
          lastSaved: new Date()
        }
      } as any);
      toast.success(t('toast.completeSuccess'));
      mutate();
    } catch (error) {
      console.error('Error marking sermon as complete:', error);
      toast.error(t('toast.completeError'));
    } finally {
      setMarkingComplete(false);
    }
  };

  if (loading) {
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
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">{t('notFound.title')}</h2>
        <Button onClick={() => navigate('/dashboard/sermons')}>
          {t('notFound.button')}
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: t('status.draft') },
      published: { variant: 'default', label: t('status.published') },
      archived: { variant: 'outline', label: t('status.archived') },
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/sermons')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* Title in header - Only visible when scrolled on large screens */}
            <div className={`flex items-center gap-3 transition-opacity duration-300 hidden lg:flex ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="h-6 w-px bg-border" />
              <span className="font-semibold truncate max-w-[300px] xl:max-w-md">
                {sermon.title}
              </span>
              {getStatusBadge(sermon.status)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowShareDialog(true)} 
              variant="ghost" 
              size="icon"
              title={t('actions.share')}
              className={sermon.isShared ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-muted-foreground hover:text-foreground"}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={() => navigate(`/dashboard/sermons/${id}/edit`)} 
              variant="ghost" 
              size="icon"
              title={t('actions.edit')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            <Button 
              onClick={() => navigate(`/dashboard/sermons/${id}/preach`)} 
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('actions.preach')}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions.share')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExport} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('actions.exportPdf')}
                </DropdownMenuItem>
                {sermon.isShared && (
                  <DropdownMenuItem onClick={() => window.open(`/share/${sermon.shareToken}`, '_blank')}>
                    <Globe className="mr-2 h-4 w-4" />
                    {t('actions.viewPublic')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {sermon.status === 'draft' && (
                  <DropdownMenuItem onClick={handlePublish} disabled={publishing}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t('actions.publish')}
                  </DropdownMenuItem>
                )}
                {sermon.status === 'published' && (
                  <DropdownMenuItem onClick={handleArchive} disabled={archiving}>
                    <Archive className="mr-2 h-4 w-4" />
                    {t('actions.archive')}
                  </DropdownMenuItem>
                )}
                {sermon.status === 'draft' && (!sermon.wizardProgress || (sermon.wizardProgress.currentStep ?? 0) < 4) && (
                  <DropdownMenuItem onClick={handleMarkComplete} disabled={markingComplete}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {markingComplete ? t('actions.markingComplete') : t('actions.markComplete')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)} 
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('actions.delete')}
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
                <h3>{t('series.partOf')}</h3>
              </div>
              <div>
                <h4 className="font-bold text-lg cursor-pointer hover:underline" onClick={() => navigate(`/dashboard/plans/${series.id}`)}>
                  {series.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {series.description}
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/dashboard/plans/${series.id}`)}>
                {t('series.viewFull')}
              </Button>
            </Card>
          )}

          {/* Preaching History */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <History className="h-4 w-4" />
                <h3>{t('history.title')}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowLogDialog(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {(!sermon.preachingHistory || sermon.preachingHistory.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t('history.empty')}
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
            <AlertDialogTitle>{t('dialogs.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.delete.description', { title: sermon.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialogs.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t('dialogs.delete.deleting') : t('dialogs.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.share.title')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.share.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
              <Label htmlFor="share-mode" className="flex flex-col space-y-1 cursor-pointer">
                <span className="font-medium">{t('dialogs.share.publicMode')}</span>
                <span className="font-normal text-xs text-muted-foreground">
                  {t('dialogs.share.publicModeDesc')}
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
                <Label>{t('dialogs.share.publicLink')}</Label>
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
                  {t('dialogs.share.copyTip')}
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
            <DialogTitle>{t('dialogs.log.title')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.log.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="log-date">{t('dialogs.log.date')}</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-duration">{t('dialogs.log.duration')}</Label>
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
              <Label htmlFor="log-location">{t('dialogs.log.location')}</Label>
              <div className="relative">
                <Input
                  id="log-location"
                  value={logLocation}
                  onChange={(e) => setLogLocation(e.target.value)}
                  placeholder={t('dialogs.log.locationPlaceholder')}
                  className="pl-8"
                />
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-notes">{t('dialogs.log.notes')}</Label>
              <Textarea
                id="log-notes"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder={t('dialogs.log.notesPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>{t('dialogs.delete.cancel')}</Button>
            <Button onClick={handleLogPreaching} disabled={logging || !logLocation}>
              {logging ? t('dialogs.log.saving') : t('dialogs.log.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
