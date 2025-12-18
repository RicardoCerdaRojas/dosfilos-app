import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, BookOpen, MoreVertical, Pencil, Trash2, Eye, Wand2 } from 'lucide-react';
import { SermonSeriesEntity } from '@dosfilos/domain';
import { seriesService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useTranslation } from '@/i18n';

export function SeriesList() {
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { t } = useTranslation('series');
  const [series, setSeries] = useState<SermonSeriesEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesToDelete, setSeriesToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadSeries();
    }
  }, [user]);

  const loadSeries = async () => {
    try {
      if (!user) return;
      const data = await seriesService.getUserSeries(user.uid);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!seriesToDelete) return;
    setDeleting(true);
    try {
      await seriesService.deleteSeries(seriesToDelete);
      setSeries(prev => prev.filter(s => s.id !== seriesToDelete));
      setSeriesToDelete(null);
    } catch (error) {
      console.error('Error deleting series:', error);
    } finally {
      setDeleting(false);
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

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">{t('empty.title')}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('empty.description')}
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard/planner')}>
            <Wand2 className="mr-2 h-5 w-5" />
            {t('empty.aiPlannerButton')}
          </Button>
          <Button onClick={() => navigate('/dashboard/plans/new')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            {t('empty.createButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('header.title')}</h1>
          <p className="text-muted-foreground">{t('header.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/planner')} className="hidden sm:flex">
            <Wand2 className="mr-2 h-4 w-4" />
            {t('header.aiPlannerButton')}
          </Button>
          <Button onClick={() => navigate('/dashboard/plans/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('header.newPlanButton')}
          </Button>
        </div>
      </div>

      {/* Series Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {series.map((item) => (
          <Card key={item.id} className="group flex flex-col hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50 overflow-hidden">
            {item.coverUrl && (
              <div className="h-48 w-full overflow-hidden">
                <img 
                  src={item.coverUrl} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(item.startDate).toLocaleDateString('es-ES', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <Badge variant="secondary">
                  {/* Count only plannedSermons as source of truth for the plan */}
                  {item.metadata?.plannedSermons?.length || 0} {t('sermonCount')}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 
                  className="text-xl font-bold font-serif leading-tight cursor-pointer group-hover:text-primary transition-colors"
                  onClick={() => navigate(`/dashboard/plans/${item.id}`)}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-end gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:text-primary"
                onClick={() => navigate(`/series/${item.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:text-primary"
                onClick={() => navigate(`/dashboard/plans/${item.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setSeriesToDelete(item.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!seriesToDelete} onOpenChange={() => setSeriesToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
