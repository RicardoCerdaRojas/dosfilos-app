import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { AIProject } from '@dosfilos/domain';
import { SermonGridCard } from './SermonGridCard';
import type { SermonVersionGroup } from '../../utils/groupSermonVersions';

interface SermonVersionsGroupProps {
    group: SermonVersionGroup;
    getSeriesName: (seriesId?: string) => string | null;
    projectById: Map<string, AIProject>;
    onDelete: (id: string) => void;
    onCreateVersion: (id: string) => void;
    /** Root-card bulk-select state (only the root slide is selectable). */
    selected?: boolean;
    onToggleSelect?: (id: string) => void;
    selectionActive?: boolean;
}

/**
 * One uniform grid cell holding a sermon and its versions as a horizontal
 * carousel. Slide 0 is the original; the rest are versions in vN order. A pager
 * (arrows + dots + counter) appears only when there is more than one slide, so
 * single-sermon cells look untouched and every cell keeps the same footprint.
 */
export const SermonVersionsGroup: React.FC<SermonVersionsGroupProps> = ({
    group,
    getSeriesName,
    projectById,
    onDelete,
    onCreateVersion,
    selected = false,
    onToggleSelect,
    selectionActive = false,
}) => {
    const { t } = useTranslation('sermons');
    const slides = [group.root, ...group.versions];
    const [active, setActive] = useState(0);
    const hasVersions = slides.length > 1;

    // Guard the index if the group shrinks (e.g. a version was deleted).
    const index = Math.min(active, slides.length - 1);
    const current = slides[index]!;
    const isRoot = index === 0;
    const projectFor = (projectId?: string) => (projectId ? projectById.get(projectId) ?? null : null);

    const go = (next: number) => setActive((next + slides.length) % slides.length);

    return (
        <div className="flex flex-col">
            <div className="min-h-[220px]">
                <SermonGridCard
                    key={current.id}
                    sermon={current}
                    seriesName={getSeriesName(current.seriesId)}
                    project={projectFor(current.projectId)}
                    onDelete={() => onDelete(current.id)}
                    onCreateVersion={() => onCreateVersion(current.id)}
                    // Only the original is bulk-selectable; versions are managed
                    // via their own row actions.
                    selected={isRoot ? selected : false}
                    onToggleSelect={isRoot ? onToggleSelect : undefined}
                    selectionActive={isRoot ? selectionActive : false}
                />
            </div>

            {hasVersions && (
                <div className="mt-2 flex items-center justify-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => go(index - 1)}
                        aria-label={t('versions.prev')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1.5" role="tablist" aria-label={t('versions.pagerLabel')}>
                        {slides.map((slide, i) => (
                            <button
                                key={slide.id}
                                onClick={() => setActive(i)}
                                role="tab"
                                aria-selected={i === index}
                                aria-label={i === 0 ? t('versions.original') : `v${i + 1}`}
                                className={cn(
                                    'h-2 w-2 rounded-full transition-colors',
                                    i === index ? 'bg-info' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                                )}
                            />
                        ))}
                    </div>

                    <span className="text-[11px] text-muted-foreground tabular-nums min-w-[28px] text-center">
                        {index + 1}/{slides.length}
                    </span>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => go(index + 1)}
                        aria-label={t('versions.next')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};
