import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, FolderOpen, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { Extraction, AIProject } from '@dosfilos/domain';

interface ExtractionProjectsPickerProps {
    extraction: Extraction;
    projects: AIProject[];
    onAddToProject: (projectId: string) => void;
    onRemoveFromProject: (projectId: string) => void;
    /** The trigger element. If omitted, a default Pin icon button is rendered. */
    trigger?: React.ReactNode;
}

/**
 * Multi-select Popover for pinning an artifact to one or more projects.
 *
 * Replaces the v1 `window.prompt` numeric picker. Each project shown
 * as a row with a checkbox; toggling fires add/remove immediately
 * (no Save button — feels like Google Drive's "Add to folder" flow).
 *
 * When the user has zero projects, the picker shows a one-line empty
 * state with a hint to create a project first. We don't try to launch
 * a project-creation modal from here — that's a separate intent and
 * collapses two flows into one.
 */
export function ExtractionProjectsPicker({
    extraction,
    projects,
    onAddToProject,
    onRemoveFromProject,
    trigger,
}: ExtractionProjectsPickerProps) {
    const { t } = useTranslation('faculty');
    const [open, setOpen] = useState(false);

    const isPinnedTo = (projectId: string) => extraction.projectIds.includes(projectId);

    const togglePin = (projectId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (isPinnedTo(projectId)) {
            onRemoveFromProject(projectId);
        } else {
            onAddToProject(projectId);
        }
    };

    const defaultTrigger = (
        <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            aria-label={t('extractionsList.actions.pin')}
        >
            <Pin className={cn("w-3.5 h-3.5", extraction.projectIds.length > 0 && "fill-current text-indigo-500")} />
            {extraction.projectIds.length > 0 && (
                <span className="text-xs">{extraction.projectIds.length}</span>
            )}
        </Button>
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild onClick={e => e.stopPropagation()}>
                {trigger ?? defaultTrigger}
            </PopoverTrigger>
            <PopoverContent
                className="w-72 p-0"
                align="end"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground">
                    {t('extractionsList.picker.title')}
                </div>
                {projects.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                        {t('extractionsList.picker.empty')}
                    </div>
                ) : (
                    <div className="max-h-64 overflow-y-auto sidebar-scrollbar py-1">
                        {projects.map(project => {
                            const pinned = isPinnedTo(project.id);
                            return (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={e => togglePin(project.id, e)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/60 transition-colors",
                                        pinned && "bg-accent/30"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                        pinned
                                            ? "bg-indigo-500 border-indigo-500"
                                            : "border-slate-300 dark:border-zinc-700"
                                    )}>
                                        {pinned && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 text-left truncate" title={project.title}>
                                        {project.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="px-3 py-2 border-t text-[10px] text-muted-foreground">
                    {t('extractionsList.picker.hint')}
                </div>
            </PopoverContent>
        </Popover>
    );
}
