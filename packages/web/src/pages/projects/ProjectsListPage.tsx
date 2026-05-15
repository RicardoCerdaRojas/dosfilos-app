import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    FolderKanban,
    MessageSquareQuote,
    FileText,
    Loader2,
    Search,
    MoreVertical,
    Archive,
    ArchiveRestore,
    Pencil,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { useFacultySessions } from '@/hooks/faculty/useFacultySessions';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { ProjectEditDialog } from '@/pages/faculty/ProjectEditDialog';
import { UpgradeRequiredModal } from '@/components/upgrade';
import { ProjectsEmptyState } from './components/ProjectsEmptyState';
import { cn } from '@/lib/utils';
import type { AIProject, ProjectColor } from '@dosfilos/domain';

const COLOR_DOT: Record<ProjectColor, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    slate: 'bg-muted/400',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
};

type FilterTab = 'active' | 'archived' | 'trash';

export function ProjectsListPage() {
    const navigate = useNavigate();
    const { projects, isLoadingProjects, archiveProject, softDeleteProject, deleteProject } =
        useFacultyProjects();
    const { sessions } = useFacultySessions();
    const { checkCanCreateProject } = useUsageLimits();
    const [dialogState, setDialogState] = useState<
        | { mode: 'create' }
        | { mode: 'edit'; project: AIProject }
        | null
    >(null);
    const [tab, setTab] = useState<FilterTab>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmHardDelete, setConfirmHardDelete] = useState<AIProject | null>(null);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    /**
     * Pre-checks the plan-level project quota (Hito 5.2). Free tier doesn't
     * include projects → opens the upgrade modal instead of the create dialog.
     */
    const handleOpenCreate = async () => {
        const check = await checkCanCreateProject();
        if (!check.allowed) {
            setUpgradeModalOpen(true);
            return;
        }
        setDialogState({ mode: 'create' });
    };

    const filteredProjects = useMemo(() => {
        const all = projects ?? [];
        const byTab = all.filter((p) => {
            if (tab === 'trash') return !!p.deletedAt;
            // active and archived tabs both exclude trashed
            if (p.deletedAt) return false;
            return tab === 'archived' ? !!p.archivedAt : !p.archivedAt;
        });
        const q = searchQuery.trim().toLowerCase();
        const bySearch = q
            ? byTab.filter(
                  (p) =>
                      p.title.toLowerCase().includes(q) ||
                      (p.contextNote ?? '').toLowerCase().includes(q)
              )
            : byTab;
        return [...bySearch].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }, [projects, tab, searchQuery]);

    const counts = useMemo(() => {
        const all = projects ?? [];
        return {
            active: all.filter((p) => !p.archivedAt && !p.deletedAt).length,
            archived: all.filter((p) => !!p.archivedAt && !p.deletedAt).length,
            trash: all.filter((p) => !!p.deletedAt).length,
        };
    }, [projects]);

    // Sessions count per project (client-side aggregation)
    const sessionsByProject = useMemo(() => {
        const map = new Map<string, number>();
        for (const s of sessions ?? []) {
            if (s.projectId) {
                map.set(s.projectId, (map.get(s.projectId) ?? 0) + 1);
            }
        }
        return map;
    }, [sessions]);

    const handleArchive = async (project: AIProject, archive: boolean) => {
        try {
            await archiveProject.mutateAsync({ projectId: project.id, archived: archive });
            toast.success(archive ? `"${project.title}" archivado` : `"${project.title}" restaurado`);
        } catch (err: any) {
            toast.error(err?.message ?? 'Error al archivar');
        }
    };

    const handleSoftDelete = async (project: AIProject, deleted: boolean) => {
        try {
            await softDeleteProject.mutateAsync({ projectId: project.id, deleted });
            toast.success(
                deleted
                    ? `"${project.title}" movido a la papelera`
                    : `"${project.title}" restaurado`
            );
        } catch (err: any) {
            toast.error(err?.message ?? 'Error');
        }
    };

    const handleHardDelete = async () => {
        if (!confirmHardDelete) return;
        try {
            await deleteProject.mutateAsync(confirmHardDelete.id);
            toast.success(`"${confirmHardDelete.title}" eliminado permanentemente`);
            setConfirmHardDelete(null);
        } catch (err: any) {
            toast.error(err?.message ?? 'Error al eliminar');
        }
    };

    const isCompletelyEmpty =
        !isLoadingProjects &&
        counts.active === 0 &&
        counts.archived === 0 &&
        counts.trash === 0;

    if (isCompletelyEmpty) {
        return (
            <div className="min-h-full bg-background text-foreground antialiased">
                <ProjectsEmptyState onCreateProject={handleOpenCreate} />

                {dialogState && (
                    <ProjectEditDialog
                        project={dialogState.mode === 'edit' ? dialogState.project : undefined}
                        onClose={() => setDialogState(null)}
                    />
                )}

                <UpgradeRequiredModal
                    open={upgradeModalOpen}
                    onOpenChange={setUpgradeModalOpen}
                    reason="module_restricted"
                    module="Proyectos"
                />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background text-foreground antialiased">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8 lg:py-10 space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium">
                            Tus proyectos
                        </div>
                        <h1 className="font-reading text-[34px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-foreground">
                            Tu trabajo en curso.
                        </h1>
                        <p className="text-[15px] md:text-[16px] leading-relaxed text-muted-foreground max-w-2xl">
                            Un proyecto es un espacio dedicado para una unidad de tu trabajo —
                            un sermón, una serie, un estudio, un curso. Aquí viven sus fuentes,
                            conversaciones y material producido.
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenCreate}
                        className="bg-foreground hover:bg-foreground/90 text-background font-medium gap-1.5 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo proyecto
                    </Button>
                </header>

                {/* Filter bar — tabs + search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-1">
                    <div className="flex items-center gap-1">
                        {(['active', 'archived', 'trash'] as const).map((t) => {
                            const isActive = tab === t;
                            const count =
                                t === 'active'
                                    ? counts.active
                                    : t === 'archived'
                                      ? counts.archived
                                      : counts.trash;
                            const label =
                                t === 'active' ? 'Activos' : t === 'archived' ? 'Archivados' : 'Papelera';
                            return (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                                        isActive
                                            ? 'border-foreground text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {label}
                                    <span
                                        className={cn(
                                            'text-[11px] font-mono',
                                            isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
                        <Input
                            type="text"
                            placeholder="Buscar por título o contexto…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 border-border/60 text-[13px] focus-visible:ring-indigo-600"
                        />
                    </div>
                </div>

                {/* Grid */}
                {isLoadingProjects ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="h-6 w-6 text-muted-foreground/70 animate-spin" />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-muted/40 border border-border/60 rounded-xl px-6 py-12 text-center">
                        <FolderKanban className="h-6 w-6 text-muted-foreground/70 mx-auto mb-3" />
                        <p className="text-[14px] text-muted-foreground">
                            {searchQuery
                                ? `Sin coincidencias para "${searchQuery}" en ${tab === 'archived' ? 'archivados' : tab === 'trash' ? 'papelera' : 'activos'}.`
                                : tab === 'archived'
                                  ? 'No tienes proyectos archivados.'
                                  : tab === 'trash'
                                    ? 'La papelera está vacía.'
                                    : 'No tienes proyectos activos.'}
                        </p>
                    </div>
                ) : (
                    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredProjects.map((project) => {
                            const sessionCount = sessionsByProject.get(project.id) ?? 0;
                            const sourceCount = project.sourceIds?.length ?? 0;
                            const isArchived = !!project.archivedAt;
                            const isTrashed = !!project.deletedAt;
                            return (
                                <article
                                    key={project.id}
                                    className={cn(
                                        'group relative bg-card border rounded-xl p-6 hover:shadow-sm transition-all flex flex-col gap-4 text-left',
                                        isTrashed
                                            ? 'border-border/50 bg-muted/40 opacity-80'
                                            : isArchived
                                              ? 'border-border/50 bg-muted/30'
                                              : 'border-border/60 hover:border-border'
                                    )}
                                >
                                    {/* Top row: color dot + dropdown */}
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={cn(
                                                'h-2.5 w-2.5 rounded-full',
                                                COLOR_DOT[project.color] ?? 'bg-slate-400'
                                            )}
                                        />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-muted-foreground/70 hover:text-foreground/80 p-1 -mr-1 rounded transition-colors"
                                                    aria-label="Acciones del proyecto"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52">
                                                {isTrashed ? (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => handleSoftDelete(project, false)}
                                                        >
                                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                                            Restaurar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setConfirmHardDelete(project)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar permanentemente
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setDialogState({ mode: 'edit', project })
                                                            }
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleArchive(project, !isArchived)}
                                                        >
                                                            {isArchived ? (
                                                                <>
                                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                                    Desarchivar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Archive className="mr-2 h-4 w-4" />
                                                                    Archivar
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleSoftDelete(project, true)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Mover a la papelera
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Body — clickable (also for trashed, for review) */}
                                    <button
                                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                                        className="text-left flex-1 space-y-1.5"
                                    >
                                        <h2 className="font-reading text-[22px] leading-tight text-foreground line-clamp-2">
                                            {project.title}
                                        </h2>
                                        {project.contextNote && (
                                            <p className="text-[13.5px] leading-relaxed text-muted-foreground line-clamp-3">
                                                {project.contextNote}
                                            </p>
                                        )}
                                    </button>

                                    {/* Footer: meta + status badge */}
                                    <div className="flex items-center gap-4 pt-2 border-t border-border/40 text-[12px] text-muted-foreground">
                                        {isTrashed ? (
                                            <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-red-600/80 inline-flex items-center gap-1">
                                                <Trash2 className="h-3 w-3" />
                                                En papelera
                                            </span>
                                        ) : isArchived ? (
                                            <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground/70 inline-flex items-center gap-1">
                                                <Archive className="h-3 w-3" />
                                                Archivado
                                            </span>
                                        ) : (
                                            <>
                                                <span className="inline-flex items-center gap-1">
                                                    <MessageSquareQuote className="h-3.5 w-3.5" />
                                                    {sessionCount}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    {sourceCount}
                                                </span>
                                            </>
                                        )}
                                        <span className="ml-auto">
                                            {new Date(project.updatedAt).toLocaleDateString(
                                                undefined,
                                                { month: 'short', day: 'numeric' }
                                            )}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>

            {/* Create / Edit dialog */}
            {dialogState && (
                <ProjectEditDialog
                    project={dialogState.mode === 'edit' ? dialogState.project : undefined}
                    onClose={() => setDialogState(null)}
                />
            )}

            {/* Free-tier gate: shown when a Free user clicks "Nuevo proyecto". */}
            <UpgradeRequiredModal
                open={upgradeModalOpen}
                onOpenChange={setUpgradeModalOpen}
                reason="module_restricted"
                module="Proyectos"
            />

            {/* Permanent delete confirmation (only from trash tab) */}
            <AlertDialog
                open={!!confirmHardDelete}
                onOpenChange={(o) => !o && setConfirmHardDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar permanentemente</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{confirmHardDelete?.title}" se eliminará para siempre. Las sesiones de
                            chat asociadas pasarán a "Sin proyecto" y los sermones quedarán sin
                            vincular. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleHardDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

