import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, FileText, LayoutGrid, List, Filter, Sparkles, Sprout, Trash2,
} from 'lucide-react';
import { usePastoralFidelityGate } from '@/hooks/usePastoralFidelityGate';
import { PASTORAL_SEED_STEP_ORDER, SermonSeriesEntity } from '@dosfilos/domain';
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
import { usePastoralSeedsByUser } from '@/hooks/usePastoralSeedsByUser';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { useFirebase } from '@/context/firebase-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { useCreateVersionFlow } from './sermons/hooks/useCreateVersionFlow';
import { LinkToProjectDialog } from './sermons/components/list/LinkToProjectDialog';
import { CreateVersionDialog } from './sermons/components/list/CreateVersionDialog';
import { SermonVersionsGroup } from './sermons/components/list/SermonVersionsGroup';
import { SermonsTableGroup } from './sermons/components/list/SermonsTableGroup';
import { groupSermonVersions } from './sermons/utils/groupSermonVersions';
import { SermonsEmptyState } from './sermons/components/list/SermonsEmptyState';
import { SermonInProgressCard } from './sermons/components/list/SermonInProgressCard';
import { BulkSelectionBar } from './sermons/components/list/BulkSelectionBar';
import { useBulkSelection } from './sermons/hooks/useBulkSelection';
import { toast } from 'sonner';

export function SermonsPage() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { t } = useTranslation('sermons');
    const pastoralGate = usePastoralFidelityGate();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    // "Publicados" tab = finished/published list (default). "En curso"
    // = pastoral-fidelity wizard drafts whose seed exists — surfaces
    // the pastor's labor (manifesto P1) instead of hiding it behind
    // the wizard. Tab is suppressed entirely when no in-progress
    // seeds exist, so legacy users see no change.
    const [activeTab, setActiveTab] = useState<'published' | 'in_progress'>('published');
    const { bySermonId: seedsBySermonId, seeds: pastoralSeeds, refetch: refetchSeeds } = usePastoralSeedsByUser();
    const [sermonToDelete, setSermonToDelete] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [series, setSeries] = useState<SermonSeriesEntity[]>([]);

    const { sermons, loading, refetch } = useSermons({
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        orderBy: 'updatedAt',
        order: 'desc',
    });

    const { deleteSermon, loading: deleting } = useDeleteSermon();
    // Bulk-select state is per-tab so a selection in "Sermones" doesn't
    // leak into "Estudios en curso" and vice-versa. Both bars share the
    // same dialog + delete handler so the UX stays uniform.
    const publishedSelection = useBulkSelection();
    const inProgressSelection = useBulkSelection();
    const [bulkConfirm, setBulkConfirm] = useState<null | { ids: string[]; surface: 'published' | 'in_progress' }>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const { projects } = useFacultyProjects();
    const projectById = new Map(projects?.map((p) => [p.id, p]) ?? []);
    const { sermonToLink, setSermonToLink, linking, linkToProject } = useLinkSermonToProject(refetch);
    const { sermonToVersion, setSermonToVersion, creating: creatingVersion, confirmCreateVersion } =
        useCreateVersionFlow(refetch);

    const sermonBeingLinked = sermonToLink ? sermons.find(s => s.id === sermonToLink) ?? null : null;
    const sermonBeingVersioned = sermonToVersion ? sermons.find(s => s.id === sermonToVersion) ?? null : null;

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

        // Hide only IN-PROGRESS wizard drafts (wizardProgress, no published copy,
        // and no content body yet). A finished draft — one that reached a saved
        // sermon body — belongs in this list with its "Borrador" badge.
        if (sermon.wizardProgress && !sermon.sourceSermonId && !sermon.hasContent) return false;

        const matchesSearch = sermon.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = planFilter === 'all'
            ? true
            : planFilter === 'none'
                ? !sermon.seriesId
                : sermon.seriesId === planFilter;
        return matchesSearch && matchesPlan;
    });

    // Pastoral-fidelity drafts: sermons whose pastoral seed exists
    // (regardless of completion). These are the "Estudios en curso"
    // tab — the pastor's own labor that the main list rule hides.
    // We honour the same search + plan filters as the published list
    // so the pastor's filter intent works across tabs; status filter
    // is irrelevant here (every in-progress is by definition a draft).
    const inProgressSermons = sermons
        .filter((sermon) => {
            if (sermon.status === 'working') return false;
            if (sermon.status === 'published' || sermon.status === 'archived') return false;
            // A sermon that already has a content body is FINISHED — it lives in
            // the "Sermones" list, not here, even though its study seed exists.
            if (sermon.hasContent) return false;
            if (!seedsBySermonId.has(sermon.id)) return false;
            const seed = seedsBySermonId.get(sermon.id)!;
            // Search matches title OR passage so the pastor can filter
            // by the seed's passage (e.g. "Juan") even when the sermon
            // title was left as the boilerplate "Sermón sobre …".
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q
                || sermon.title.toLowerCase().includes(q)
                || (sermon.bibleReferences?.[0] ?? seed.passage).toLowerCase().includes(q);
            const matchesPlan = planFilter === 'all'
                ? true
                : planFilter === 'none'
                    ? !sermon.seriesId
                    : sermon.seriesId === planFilter;
            return matchesSearch && matchesPlan;
        })
        .sort((a, b) => {
            const aDate = seedsBySermonId.get(a.id)?.updatedAt ?? a.updatedAt;
            const bDate = seedsBySermonId.get(b.id)?.updatedAt ?? b.updatedAt;
            return bDate.getTime() - aDate.getTime();
        });

    const hasInProgress = inProgressSermons.length > 0;

    /**
     * Renders the canonical "published / finished" list (table or grid)
     * with the existing counter row above. Pulled into a helper so we
     * can reuse it inside the `published` tab and as the bare fallback
     * when no in-progress drafts exist (legacy flow unchanged).
     */
    const renderPublishedList = () => {
        // Fold versions under their root. Bulk-selection operates on roots
        // (versions are managed via their own row actions), so the pool is the
        // set of root ids, not every sermon.
        const sermonGroups = groupSermonVersions(filteredSermons);
        const pool = sermonGroups.map((g) => g.root.id);
        const selectionActive = publishedSelection.count > 0;
        return (
            <>
                <BulkSelectionBar
                    count={publishedSelection.count}
                    poolSize={sermonGroups.length}
                    allSelected={publishedSelection.allSelected(pool)}
                    onToggleAll={() => publishedSelection.toggleAll(pool)}
                    onClear={publishedSelection.clear}
                    onDelete={() =>
                        setBulkConfirm({ ids: Array.from(publishedSelection.selected), surface: 'published' })
                    }
                    deleting={bulkDeleting}
                />
                <div className="text-sm text-muted-foreground mb-3">
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
                                {sermonGroups.map((group) => (
                                    <SermonsTableGroup
                                        key={group.root.id}
                                        group={group}
                                        getSeriesName={getSeriesName}
                                        projectById={projectById}
                                        onDelete={setSermonToDelete}
                                        onLink={setSermonToLink}
                                        onCreateVersion={setSermonToVersion}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
                        {sermonGroups.map((group) => (
                            <SermonVersionsGroup
                                key={group.root.id}
                                group={group}
                                getSeriesName={getSeriesName}
                                projectById={projectById}
                                onDelete={setSermonToDelete}
                                onCreateVersion={setSermonToVersion}
                                selected={publishedSelection.isSelected(group.root.id)}
                                onToggleSelect={publishedSelection.toggle}
                                selectionActive={selectionActive}
                            />
                        ))}
                    </div>
                )}
            </>
        );
    };

    const handleDelete = async () => {
        if (!sermonToDelete) return;
        await deleteSermon(sermonToDelete);
        setSermonToDelete(null);
        refetch();
        // Seed may be orphaned now; refetch so the "Estudios en curso"
        // counter and tab don't show a phantom card.
        void refetchSeeds();
    };

    const handleBulkDeleteConfirmed = async () => {
        if (!bulkConfirm) return;
        const ids = bulkConfirm.ids;
        const surface = bulkConfirm.surface;
        setBulkDeleting(true);
        // Promise.allSettled — one failure does not block the rest. The
        // useDeleteSermon hook already toasts per-call, so we add a single
        // summary toast at the end with success/failure counts.
        const results = await Promise.allSettled(ids.map((id) => deleteSermon(id)));
        setBulkDeleting(false);
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - ok;
        if (ok > 0) {
            toast.success(`${ok} ${ok === 1 ? 'sermón eliminado' : 'sermones eliminados'}.`);
        }
        if (failed > 0) {
            toast.error(`No se pudieron eliminar ${failed}. Reintenta los que quedaron.`);
        }
        if (surface === 'published') {
            publishedSelection.clear();
        } else {
            inProgressSelection.clear();
        }
        setBulkConfirm(null);
        refetch();
        void refetchSeeds();
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
        <div className="space-y-6 p-5 max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
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
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => navigate('/dashboard/sermons/tutor')} className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-primary" />
                            {t('header.generateWithTutor')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/*
                          Pastoral Fidelity Phase 1 entry: when the flag is
                          on, surface the canonical eight-step spine flow as
                          the primary guided path. The blank editor stays
                          ALWAYS visible as a tertiary, honest option —
                          "ya estudié, solo quiero escribir". P1/P2 are
                          reinforced by blank (pure pastor labor, zero AI
                          origination); we just don't promote it as the
                          easy default.
                        */}
                        {pastoralGate.allowed && (
                            <DropdownMenuItem
                                onClick={() => navigate('/dashboard/sermons/generate?new=true')}
                                className="cursor-pointer"
                            >
                                <Sprout className="mr-2 h-4 w-4 text-emerald-600" />
                                <div className="flex flex-col">
                                    <span>Estudio guiado ({PASTORAL_SEED_STEP_ORDER.length} pasos)</span>
                                    <span className="text-[10px] text-muted-foreground">Pastor estudia primero, sistema desarrolla.</span>
                                </div>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => navigate('/dashboard/sermons/new')} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span>{t('header.createBlank')}</span>
                                <span className="text-[10px] text-muted-foreground">{t('header.createBlankHint')}</span>
                            </div>
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

                {/* Status filter is meaningless for the in-progress
                    tab (every row is a draft), so we hide it there.
                    Selecting a different status auto-switches back to
                    the published tab below. */}
                {activeTab === 'published' && (
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
                )}

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

            {hasInProgress ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'published' | 'in_progress')}>
                    <TabsList className="mb-3">
                        <TabsTrigger value="published">
                            Sermones ({filteredSermons.length})
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="gap-1.5">
                            <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                            Estudios en curso ({inProgressSermons.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="published" className="mt-0">
                        {renderPublishedList()}
                    </TabsContent>

                    <TabsContent value="in_progress" className="mt-0">
                        <BulkSelectionBar
                            count={inProgressSelection.count}
                            poolSize={inProgressSermons.length}
                            allSelected={inProgressSelection.allSelected(inProgressSermons.map((s) => s.id))}
                            onToggleAll={() => inProgressSelection.toggleAll(inProgressSermons.map((s) => s.id))}
                            onClear={inProgressSelection.clear}
                            onDelete={() =>
                                setBulkConfirm({
                                    ids: Array.from(inProgressSelection.selected),
                                    surface: 'in_progress',
                                })
                            }
                            deleting={bulkDeleting}
                            label="estudios"
                        />
                        {inProgressSermons.length === 0 ? (
                            <Card className="p-8 text-center">
                                <p className="text-muted-foreground">
                                    No tienes estudios en curso. Comienza un sermón para iniciar tu estudio personal.
                                </p>
                            </Card>
                        ) : viewMode === 'table' ? (
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">{t('table.title')}</TableHead>
                                            <TableHead>Pasaje</TableHead>
                                            <TableHead>Progreso</TableHead>
                                            <TableHead>Actualizado</TableHead>
                                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inProgressSermons.map((sermon) => {
                                            const seed = seedsBySermonId.get(sermon.id)!;
                                            const pct = Math.round((seed.completedSteps / seed.totalSteps) * 100);
                                            return (
                                                <TableRow key={sermon.id} className="hover:bg-muted/30">
                                                    <td className="p-3 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            <Sprout className="h-4 w-4 text-emerald-600 shrink-0" />
                                                            <span className="font-medium truncate" title={sermon.title}>
                                                                {sermon.title}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 align-middle text-sm">
                                                        {sermon.bibleReferences?.[0] ?? seed.passage}
                                                    </td>
                                                    <td className="p-3 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${seed.completed ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                                {seed.completedSteps}/{seed.totalSteps}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 align-middle text-xs text-muted-foreground">
                                                        {seed.updatedAt.toLocaleString()}
                                                    </td>
                                                    <td className="p-3 align-middle text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setSermonToDelete(sermon.id)}
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => navigate(`/dashboard/sermons/generate?id=${sermon.id}`)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 h-7"
                                                            >
                                                                Continuar
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {inProgressSermons.map((sermon) => {
                                    const seed = seedsBySermonId.get(sermon.id)!;
                                    return (
                                        <SermonInProgressCard
                                            key={sermon.id}
                                            sermonId={sermon.id}
                                            title={sermon.title}
                                            passage={sermon.bibleReferences?.[0] ?? seed.passage}
                                            seed={seed}
                                            onDelete={() => setSermonToDelete(sermon.id)}
                                            selected={inProgressSelection.isSelected(sermon.id)}
                                            onToggleSelect={inProgressSelection.toggle}
                                            selectionActive={inProgressSelection.count > 0}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            ) : (
                renderPublishedList()
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

            <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Eliminar {bulkConfirm?.ids.length ?? 0}{' '}
                            {bulkConfirm?.surface === 'in_progress' ? 'estudios' : 'sermones'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán los {bulkConfirm?.ids.length ?? 0}{' '}
                            {bulkConfirm?.surface === 'in_progress' ? 'estudios seleccionados' : 'sermones seleccionados'}
                            {' '}de forma permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDeleteConfirmed}
                            disabled={bulkDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="sermons-bulk-delete-confirm"
                        >
                            {bulkDeleting ? 'Eliminando…' : `Eliminar ${bulkConfirm?.ids.length ?? 0}`}
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

            <CreateVersionDialog
                sermon={sermonBeingVersioned}
                creating={creatingVersion}
                onClose={() => setSermonToVersion(null)}
                onConfirm={confirmCreateVersion}
            />
        </div>
    );
}
