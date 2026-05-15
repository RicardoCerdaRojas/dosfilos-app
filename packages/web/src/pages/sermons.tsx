import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, FileText, LayoutGrid, List, Filter, Sparkles,
} from 'lucide-react';
import { SermonSeriesEntity } from '@dosfilos/domain';
import { seriesService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
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
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/i18n';
import { useLinkSermonToProject } from './sermons/hooks/useLinkSermonToProject';
import { LinkToProjectDialog } from './sermons/components/list/LinkToProjectDialog';
import { SermonGridCard } from './sermons/components/list/SermonGridCard';
import { SermonsTableRow } from './sermons/components/list/SermonsTableRow';
import { SermonsEmptyState } from './sermons/components/list/SermonsEmptyState';

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

    const { sermons, loading, refetch } = useSermons({
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        orderBy: 'updatedAt',
        order: 'desc',
    });

    const { deleteSermon, loading: deleting } = useDeleteSermon();
    const { projects } = useFacultyProjects();
    const projectById = new Map(projects?.map((p) => [p.id, p]) ?? []);
    const { sermonToLink, setSermonToLink, linking, linkToProject } = useLinkSermonToProject(refetch);

    const sermonBeingLinked = sermonToLink ? sermons.find(s => s.id === sermonToLink) ?? null : null;

    useEffect(() => {
        const loadSeries = async () => {
            if (!user) return;
            try {
                const data = await seriesService.getUserSeries(user.uid);
                setSeries(data);
            } catch (error) {
                console.error('Error loading series:', error);
            }
        };
        loadSeries();
    }, [user]);

    // Filter sermons - exclude wizard drafts from the list
    const filteredSermons = sermons.filter((sermon) => {
        // Never show 'working' status sermons in the list
        if (sermon.status === 'working') return false;

        // Hide sermons that are wizard drafts (have wizardProgress but no sourceSermonId)
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

    const getSeriesName = (seriesId?: string): string | null => {
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
        return <SermonsEmptyState />;
    }

    return (
        <div className="space-y-6 p-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('header.title')}</h1>
                    <p className="text-muted-foreground">{t('header.subtitle')}</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('header.newButton')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => navigate('/dashboard/sermons/tutor')} className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-primary" />
                            {t('header.generateWithTutor')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/dashboard/sermons/new')} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4" />
                            {t('header.createBlank')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
                    <Input
                        placeholder={t('filters.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

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
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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

            <div className="text-sm text-muted-foreground">
                {filteredSermons.length} {filteredSermons.length === 1 ? t('results.sermon') : t('results.sermons')}
                {planFilter !== 'all' && planFilter !== 'none' && (
                    <span> {t('results.inPlan')} "{getSeriesName(planFilter)}"</span>
                )}
                {planFilter === 'none' && <span> {t('results.noPlanAssigned')}</span>}
            </div>

            {filteredSermons.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                </Card>
            ) : viewMode === 'table' ? (
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
                            {filteredSermons.map((sermon) => (
                                <SermonsTableRow
                                    key={sermon.id}
                                    sermon={sermon}
                                    seriesName={getSeriesName(sermon.seriesId)}
                                    project={sermon.projectId ? projectById.get(sermon.projectId) ?? null : null}
                                    onDelete={() => setSermonToDelete(sermon.id)}
                                    onLink={() => setSermonToLink(sermon.id)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSermons.map((sermon) => (
                        <SermonGridCard
                            key={sermon.id}
                            sermon={sermon}
                            seriesName={getSeriesName(sermon.seriesId)}
                            project={sermon.projectId ? projectById.get(sermon.projectId) ?? null : null}
                            onDelete={() => setSermonToDelete(sermon.id)}
                        />
                    ))}
                </div>
            )}

            <AlertDialog open={!!sermonToDelete} onOpenChange={() => setSermonToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                            {deleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <LinkToProjectDialog
                sermon={sermonBeingLinked}
                projects={projects ?? []}
                linking={linking}
                onClose={() => setSermonToLink(null)}
                onLink={linkToProject}
            />
        </div>
    );
}
