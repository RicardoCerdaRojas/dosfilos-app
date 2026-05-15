import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquareQuote,
    FileText,
    MoreVertical,
    Pencil,
    Archive,
    ArchiveRestore,
    Trash2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AIProject, ProjectColor } from '@dosfilos/domain';
import { PROJECT_TYPES } from '@/pages/projects/projectRoadmaps';

/**
 * Tailwind border-left utility per project color. Replaces the
 * tiny color dot in the previous design with a 4px accent stripe
 * on the card's left edge — much stronger visual cue when the
 * user has many projects to scan.
 */
const COLOR_BORDER: Record<ProjectColor, string> = {
    amber: 'border-l-amber-500',
    emerald: 'border-l-emerald-500',
    sky: 'border-l-sky-500',
    rose: 'border-l-rose-500',
    violet: 'border-l-violet-500',
    slate: 'border-l-slate-400',
    orange: 'border-l-orange-500',
    teal: 'border-l-teal-500',
};

/** Tinted background for the type badge — same color family as border. */
const TYPE_BADGE_TINT: Record<ProjectColor, string> = {
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    sky: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    rose: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    violet: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    orange: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
    teal: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200',
};

interface ProjectCardProps {
    project: AIProject;
    sessionCount: number;
    onEdit: (project: AIProject) => void;
    onArchive: (project: AIProject, archive: boolean) => void;
    onSoftDelete: (project: AIProject, deleted: boolean) => void;
    onHardDeleteRequest: (project: AIProject) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    sessionCount,
    onEdit,
    onArchive,
    onSoftDelete,
    onHardDeleteRequest,
}) => {
    const navigate = useNavigate();
    const sourceCount = project.sourceIds?.length ?? 0;
    const isArchived = !!project.archivedAt;
    const isTrashed = !!project.deletedAt;
    const typeMeta = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.general;
    const TypeIcon = typeMeta.icon;
    const colorBorder = COLOR_BORDER[project.color] ?? 'border-l-slate-400';
    const badgeTint = TYPE_BADGE_TINT[project.color] ?? TYPE_BADGE_TINT.slate;

    const handleCardClick = () => navigate(`/dashboard/projects/${project.id}`);
    const handleCardKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    return (
        <article
            role="link"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            className={cn(
                'group relative bg-card border border-l-4 rounded-lg p-4 hover:shadow-md hover:border-border transition-all flex flex-col gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                colorBorder,
                isTrashed
                    ? 'border-border/40 bg-muted/30 opacity-75'
                    : isArchived
                      ? 'border-border/40 bg-muted/20'
                      : 'border-border/60',
            )}
        >
            {/* Top row: type badge + dropdown (dropdown reveals on hover) */}
            <div className="flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        badgeTint,
                    )}
                >
                    <TypeIcon className="h-3 w-3" />
                    {typeMeta.label}
                </span>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground/70 hover:text-foreground p-1 -mr-1 -mt-1 rounded transition-colors"
                                aria-label="Acciones del proyecto"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-52"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isTrashed ? (
                                <>
                                    <DropdownMenuItem onClick={() => onSoftDelete(project, false)}>
                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                        Restaurar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onHardDeleteRequest(project)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar permanentemente
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => onEdit(project)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onArchive(project, !isArchived)}>
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
                                        onClick={() => onSoftDelete(project, true)}
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
            </div>

            {/* Title + 1-line description */}
            <div className="flex-1 space-y-1">
                <h3 className="font-reading text-[17px] leading-snug text-foreground line-clamp-2">
                    {project.title}
                </h3>
                {project.contextNote && (
                    <p className="text-[12.5px] leading-snug text-muted-foreground line-clamp-1">
                        {project.contextNote}
                    </p>
                )}
            </div>

            {/* Compact footer */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/40 text-[11.5px] text-muted-foreground">
                {isTrashed ? (
                    <span className="inline-flex items-center gap-1 text-destructive/80 font-medium">
                        <Trash2 className="h-3 w-3" />
                        Papelera
                    </span>
                ) : isArchived ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground/70 font-medium">
                        <Archive className="h-3 w-3" />
                        Archivado
                    </span>
                ) : (
                    <>
                        <span className="inline-flex items-center gap-1" title="Sesiones">
                            <MessageSquareQuote className="h-3.5 w-3.5" />
                            {sessionCount}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Fuentes">
                            <FileText className="h-3.5 w-3.5" />
                            {sourceCount}
                        </span>
                    </>
                )}
                <span className="ml-auto">
                    {new Date(project.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                    })}
                </span>
            </div>
        </article>
    );
};
