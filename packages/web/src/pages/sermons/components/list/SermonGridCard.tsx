import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, FileText, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { SermonEntity, AIProject } from '@dosfilos/domain';
import { SermonStatusBadge } from './SermonStatusBadge';
import { SermonRowActions } from './SermonRowActions';

interface SermonGridCardProps {
    sermon: SermonEntity;
    seriesName: string | null;
    project: AIProject | null;
    onDelete: () => void;
}

export const SermonGridCard: React.FC<SermonGridCardProps> = ({ sermon, seriesName, project, onDelete }) => {
    const { t, i18n } = useTranslation('sermons');
    const navigate = useNavigate();

    return (
        <Card className="py-0 group flex flex-col hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50 overflow-hidden">
            <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(sermon.updatedAt).toLocaleDateString(i18n.language, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </div>
                    <SermonStatusBadge status={sermon.status} />
                </div>

                <div className="space-y-2">
                    <h3
                        className="text-xl font-bold font-serif leading-tight cursor-pointer group-hover:text-primary transition-colors line-clamp-2"
                        onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                    >
                        {sermon.title}
                    </h3>
                    {project && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/projects/${project.id}`);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            title={t('actions.viewProject', { title: project.title })}
                        >
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', `bg-${project.color}-500`)} />
                            {project.title}
                        </button>
                    )}
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

                {sermon.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 min-w-0">
                        {sermon.tags.slice(0, 3).map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                // Long tags (some legacy sermons store full
                                // objective sentences in the tags array)
                                // overflow the card without max-w + truncate.
                                // Title attr exposes the full text on hover
                                // so we don't hide information.
                                className="text-xs font-normal bg-secondary/50 max-w-full truncate inline-block"
                                title={tag}
                            >
                                {tag}
                            </Badge>
                        ))}
                        {sermon.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center shrink-0">
                                +{sermon.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                    {sermon.bibleReferences.length > 0 && (
                        <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {sermon.bibleReferences.length} {t('grid.references')}
                        </span>
                    )}
                </div>
                <SermonRowActions sermonId={sermon.id} onDelete={onDelete} hoverPrimary />
            </div>
        </Card>
    );
};
