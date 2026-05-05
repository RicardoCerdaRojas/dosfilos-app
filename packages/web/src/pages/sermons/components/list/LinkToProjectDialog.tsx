import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { AIProject } from '@dosfilos/domain';
import type { SermonEntity } from '@dosfilos/domain';

interface LinkToProjectDialogProps {
    sermon: SermonEntity | null;
    projects: AIProject[];
    linking: string | null;
    onClose: () => void;
    onLink: (projectId: string | null) => void;
}

export const LinkToProjectDialog: React.FC<LinkToProjectDialogProps> = ({
    sermon,
    projects,
    linking,
    onClose,
    onLink,
}) => {
    const { t } = useTranslation('sermons');
    const navigate = useNavigate();
    const open = !!sermon;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium mb-2">
                        {t('linkProject.eyebrow')}
                    </div>
                    <DialogTitle className="font-reading text-[24px] leading-tight">
                        {sermon?.title || t('linkProject.fallbackTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-[14px] text-muted-foreground">
                        {t('linkProject.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 pb-6 max-h-[420px] overflow-y-auto">
                    {projects.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground py-8 text-center">
                            {t('linkProject.noProjects')}{' '}
                            <button
                                onClick={() => navigate('/dashboard/projects')}
                                className="text-primary hover:underline"
                            >
                                {t('linkProject.createOne')}
                            </button>
                        </p>
                    ) : (
                        <ul className="divide-y divide-border -mx-2">
                            {sermon?.projectId && (
                                <li>
                                    <button
                                        onClick={() => onLink(null)}
                                        disabled={!!linking}
                                        className="w-full text-left py-3 px-2 flex items-center gap-3 hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-[14px] text-foreground">{t('linkProject.noProject')}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('linkProject.unlink')}</div>
                                        </div>
                                    </button>
                                </li>
                            )}
                            {projects
                                .slice()
                                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                                .map((project) => {
                                    const isCurrent = sermon?.projectId === project.id;
                                    const isLinking = linking === sermon?.id && !isCurrent;
                                    return (
                                        <li key={project.id}>
                                            <button
                                                onClick={() => !isCurrent && onLink(project.id)}
                                                disabled={isCurrent || !!linking}
                                                className="w-full text-left py-3 px-2 flex items-center gap-3 hover:bg-muted/50 rounded transition-colors disabled:opacity-100 disabled:cursor-default"
                                            >
                                                <span
                                                    className={cn(
                                                        'h-2.5 w-2.5 rounded-full shrink-0',
                                                        `bg-${project.color}-500`,
                                                    )}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[14px] font-medium text-foreground truncate">
                                                        {project.title}
                                                    </div>
                                                    {project.contextNote && (
                                                        <div className="text-[12px] text-muted-foreground truncate">
                                                            {project.contextNote}
                                                        </div>
                                                    )}
                                                </div>
                                                {isCurrent ? (
                                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                                ) : isLinking ? (
                                                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                                                ) : null}
                                            </button>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
