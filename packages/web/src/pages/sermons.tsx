import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, FileText, Calendar, Tag, MoreVertical, Pencil, Trash2, Eye,
  LayoutGrid, List, BookOpen, Filter
} from 'lucide-react';
import { SermonEntity, SermonSeriesEntity } from '@dosfilos/domain';
import { seriesService } from '@dosfilos/application';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSermons, useDeleteSermon } from '@/hooks/use-sermons';
import { useFirebase } from '@/context/firebase-context';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export function SermonsPage() {
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { t } = useTranslation('sermons');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sermonToDelete, setSermonToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [series, setSeries] = useState<SermonSeriesEntity[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  const { sermons, loading, refetch } = useSermons({
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    orderBy: 'updatedAt',
    order: 'desc',
  });

  const { deleteSermon, loading: deleting } = useDeleteSermon();

  // Load series for filter
  useEffect(() => {
    const loadSeries = async () => {
      if (!user) return;
      try {
        const data = await seriesService.getUserSeries(user.uid);
        setSeries(data);
      } catch (error) {
        console.error('Error loading series:', error);
      } finally {
        setLoadingSeries(false);
      }
    };
    loadSeries();
  }, [user]);

  // Filter sermons - exclude wizard drafts from the list
  const filteredSermons = sermons.filter((sermon) => {
    // Never show 'working' status sermons in the list
    if (sermon.status === 'working') return false;
    
    // Also hide sermons that are wizard drafts (have wizardProgress but no sourceSermonId)
    // These are drafts that were published before our refactoring
    if (sermon.wizardProgress && !sermon.sourceSermonId) return false;
    
    const matchesSearch = sermon.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' 
      ? true 
      : planFilter === 'none' 
        ? !sermon.seriesId 
        : sermon.seriesId === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleDelete = async () => {
    if (!sermonToDelete) return;
    await deleteSermon(sermonToDelete);
    setSermonToDelete(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; className: string }> = {
      draft: { variant: 'secondary', label: t('statusLabels.draft'), className: 'bg-amber-100 text-amber-700 border-amber-300' },
      published: { variant: 'default', label: t('statusLabels.published'), className: 'bg-green-100 text-green-700 border-green-300' },
      archived: { variant: 'outline', label: t('statusLabels.archived'), className: 'bg-gray-100 text-gray-600 border-gray-300' },
    };
    const config = variants[status] ?? variants.draft!;
    return (
      <Badge variant="outline" className={cn("capitalize", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const getSeriesName = (seriesId?: string) => {
    if (!seriesId) return null;
    const found = series.find(s => s.id === seriesId);
    return found?.title || null;
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

  if (sermons.length === 0 && statusFilter === 'all' && !searchQuery && planFilter === 'all') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">{t('empty.title')}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('empty.description')}
        </p>
        <Button onClick={() => navigate('/dashboard/generate-sermon?new=true')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          {t('empty.createButton')}
        </Button>
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
        <Button onClick={() => navigate('/dashboard/generate-sermon?new=true')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('header.newButton')}
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search - Smaller on desktop */}
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
          <Input
            placeholder={t('filters.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('statusOptions.all')}</SelectItem>
            <SelectItem value="draft">{t('statusOptions.drafts')}</SelectItem>
            <SelectItem value="published">{t('statusOptions.published')}</SelectItem>
            <SelectItem value="archived">{t('statusOptions.archived')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Plan Filter */}
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {planFilter === 'all' ? t('filters.allPlans') : 
               planFilter === 'none' ? t('filters.noPlan') : 
               getSeriesName(planFilter) || t('filters.plan')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allPlans')}</SelectItem>
            <SelectItem value="none">{t('filters.noPlan')}</SelectItem>
            {series.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex border rounded-lg p-1 ml-auto">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredSermons.length} {filteredSermons.length === 1 ? t('results.sermon') : t('results.sermons')}
        {planFilter !== 'all' && planFilter !== 'none' && (
          <span> {t('results.inPlan')} "{getSeriesName(planFilter)}"</span>
        )}
        {planFilter === 'none' && <span> {t('results.noPlanAssigned')}</span>}
      </div>

      {/* Sermons List */}
      {filteredSermons.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {t('noResults')}
          </p>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">{t('table.title')}</TableHead>
                <TableHead>{t('table.plan')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.date')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSermons.map((sermon) => {
                const seriesName = getSeriesName(sermon.seriesId);
                return (
                  <TableRow key={sermon.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div 
                        className="font-medium hover:text-primary transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                      >
                        {sermon.title}
                      </div>
                      {sermon.bibleReferences?.length > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <BookOpen className="h-3 w-3" />
                          {sermon.bibleReferences.slice(0, 2).join(', ')}
                          {sermon.bibleReferences.length > 2 && ` +${sermon.bibleReferences.length - 2}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {seriesName ? (
                        <span 
                          className="text-sm text-primary hover:underline cursor-pointer"
                          onClick={() => sermon.seriesId && navigate(`/dashboard/plans/${sermon.seriesId}`)}
                        >
                          {seriesName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(sermon.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sermon.updatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/dashboard/sermons/${sermon.id}/edit`)}
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
                              onClick={() => setSermonToDelete(sermon.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSermons.map((sermon) => {
            const seriesName = getSeriesName(sermon.seriesId);
            return (
              <Card key={sermon.id} className="group flex flex-col hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50 overflow-hidden">
                <div className="p-6 flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(sermon.updatedAt).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    {getStatusBadge(sermon.status)}
                  </div>

                  {/* Title & Category */}
                  <div className="space-y-2">
                    <h3
                      className="text-xl font-bold font-serif leading-tight cursor-pointer group-hover:text-primary transition-colors line-clamp-2"
                      onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                    >
                      {sermon.title}
                    </h3>
                    {seriesName && (
                      <div 
                        className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline"
                        onClick={() => sermon.seriesId && navigate(`/dashboard/plans/${sermon.seriesId}`)}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{seriesName}</span>
                      </div>
                    )}
                    {sermon.category && !seriesName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        <span>{sermon.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {sermon.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {sermon.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal bg-secondary/50">
                          {tag}
                        </Badge>
                      ))}
                      {sermon.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{sermon.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {sermon.bibleReferences.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {sermon.bibleReferences.length} {t('grid.references')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:text-primary"
                      onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:text-primary"
                      onClick={() => navigate(`/dashboard/sermons/${sermon.id}/edit`)}
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
                          onClick={() => setSermonToDelete(sermon.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sermonToDelete} onOpenChange={() => setSermonToDelete(null)}>
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
