import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { SermonEntity, AIProject } from '@dosfilos/domain';
import { SermonStatusBadge } from './SermonStatusBadge';
import { SermonRowActions } from './SermonRowActions';

interface SermonsTableRowProps {
    sermon: SermonEntity;
    seriesName: string | null;
    project: AIProject | null;
    onDelete: () => void;
    onLink: () => void;
}

export const SermonsTableRow: React.FC<SermonsTableRowProps> = ({ sermon, seriesName, project, onDelete, onLink }) => {
    const { t, i18n } = useTranslation('sermons');
    const navigate = useNavigate();

    // Some legacy sermons stored multiple Bible refs as a single
    // semicolon-separated string inside `bibleReferences[0]` instead
    // of as separate array entries. Split + clamp so the cell never
    // pushes the table beyond the page width.
    const allRefs = sermon.bibleReferences.flatMap((r) =>
        typeof r === 'string' ? r.split(/[;,]\s*/).filter(Boolean) : [r],
    );
    const refsPreview = allRefs.slice(0, 2).join(', ');
    const refsExtra = allRefs.length > 2 ? ` +${allRefs.length - 2}` : '';
    const refsFull = allRefs.join(', ');

    return (
        <TableRow className="cursor-pointer hover:bg-muted/50">
            <TableCell className="max-w-0">
                <div
                    className="font-medium hover:text-primary transition-colors cursor-pointer truncate"
                    onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                    title={sermon.title}
                >
                    {sermon.title}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
                    {project && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/projects/${project.id}`);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors max-w-full truncate"
                            title={t('actions.viewProject', { title: project.title })}
                        >
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', `bg-${project.color}-500`)} />
                            <span className="truncate">{project.title}</span>
                        </button>
                    )}
                    {allRefs.length > 0 && (
                        <div
                            className="text-xs text-muted-foreground flex items-center gap-1 min-w-0 max-w-full"
                            title={refsFull}
                        >
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span className="truncate">{refsPreview}{refsExtra}</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className="max-w-[200px]">
                {seriesName ? (
                    <span
                        className="text-sm text-primary hover:underline cursor-pointer truncate block"
                        onClick={() => sermon.seriesId && navigate(`/dashboard/plans/${sermon.seriesId}`)}
                        title={seriesName}
                    >
                        {seriesName}
                    </span>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell>
                <SermonStatusBadge status={sermon.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
                {new Date(sermon.updatedAt).toLocaleDateString(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <SermonRowActions sermonId={sermon.id} onDelete={onDelete} onLink={onLink} />
                </div>
            </TableCell>
        </TableRow>
    );
};
