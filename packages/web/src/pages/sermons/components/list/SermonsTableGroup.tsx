import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import type { AIProject } from '@dosfilos/domain';
import { SermonsTableRow } from './SermonsTableRow';
import { SermonStatusBadge } from './SermonStatusBadge';
import { SermonRowActions } from './SermonRowActions';
import type { SermonVersionGroup } from '../../utils/groupSermonVersions';

interface SermonsTableGroupProps {
    group: SermonVersionGroup;
    getSeriesName: (seriesId?: string) => string | null;
    projectById: Map<string, AIProject>;
    onDelete: (id: string) => void;
    onLink: (id: string) => void;
    onCreateVersion: (id: string) => void;
}

/**
 * One uniform table row per sermon group. When the sermon has versions, a
 * "N versiones" chip next to the title opens a popover listing them (vN +
 * occasion label + actions), so the table never inserts indented sub-rows that
 * would break the grid rhythm.
 */
export const SermonsTableGroup: React.FC<SermonsTableGroupProps> = ({
    group,
    getSeriesName,
    projectById,
    onDelete,
    onLink,
    onCreateVersion,
}) => {
    const { t, i18n } = useTranslation('sermons');
    const navigate = useNavigate();
    const { root, versions } = group;

    const versionsSlot = versions.length > 0 && (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-info bg-info/10 border border-info/20 rounded-full px-2 py-0.5 shrink-0 hover:bg-info/20 transition-colors"
                >
                    <GitBranch className="h-3 w-3" />
                    {t('versions.count', { count: versions.length })}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2">
                <ul className="divide-y divide-border">
                    {versions.map((version, idx) => (
                        <li key={version.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                            <Badge
                                variant="outline"
                                className="shrink-0 border-info/30 bg-info/10 text-info text-[10px] px-1.5 py-0 font-medium"
                            >
                                v{idx + 2}
                            </Badge>
                            <div className="min-w-0 flex-1">
                                <button
                                    onClick={() => navigate(`/dashboard/sermons/${version.id}`)}
                                    className="block text-[13px] font-medium text-foreground hover:text-primary transition-colors truncate text-left w-full"
                                    title={version.versionLabel || version.title}
                                >
                                    {version.versionLabel || version.title}
                                </button>
                                <div className="text-[11px] text-muted-foreground">
                                    {new Date(version.updatedAt).toLocaleDateString(i18n.language, {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </div>
                            </div>
                            <SermonStatusBadge status={version.status} />
                            <SermonRowActions
                                sermonId={version.id}
                                onDelete={() => onDelete(version.id)}
                                onCreateVersion={() => onCreateVersion(version.id)}
                            />
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );

    return (
        <SermonsTableRow
            sermon={root}
            seriesName={getSeriesName(root.seriesId)}
            project={root.projectId ? projectById.get(root.projectId) ?? null : null}
            onDelete={() => onDelete(root.id)}
            onLink={() => onLink(root.id)}
            onCreateVersion={() => onCreateVersion(root.id)}
            versionsSlot={versionsSlot}
        />
    );
};
