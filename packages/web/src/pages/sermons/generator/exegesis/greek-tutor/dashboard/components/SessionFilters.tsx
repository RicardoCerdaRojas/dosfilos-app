import React from 'react';
import { Filter } from 'lucide-react';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';

export type ProgressFilter = 'all' | 'empty' | 'started' | 'half' | 'complete';
export type SortBy = 'date-desc' | 'date-asc' | 'az' | 'progress';

interface SessionFiltersProps {
    progressFilter: ProgressFilter;
    sortBy: SortBy;
    onProgressFilterChange: (filter: ProgressFilter) => void;
    onSortByChange: (sort: SortBy) => void;
}

/**
 * SessionFilters - Dropdown filters for progress and sorting
 */
export const SessionFilters: React.FC<SessionFiltersProps> = ({
    progressFilter,
    sortBy,
    onProgressFilterChange,
    onSortByChange
}) => {
    const { t } = useTranslation('greekTutor');
    return (
        <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Progress Filter */}
            <Select value={progressFilter} onValueChange={(value) => onProgressFilterChange(value as ProgressFilter)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por progreso" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('dashboard.filters.all')}</SelectItem>
                    <SelectItem value="empty">{t('dashboard.filters.empty')}</SelectItem>
                    <SelectItem value="started">{t('dashboard.filters.started')}</SelectItem>
                    <SelectItem value="half">{t('dashboard.filters.half')}</SelectItem>
                    <SelectItem value="complete">{t('dashboard.filters.complete')}</SelectItem>
                </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as SortBy)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date-desc">{t('dashboard.filters.mostRecent')}</SelectItem>
                    <SelectItem value="date-asc">{t('dashboard.filters.oldest')}</SelectItem>
                    <SelectItem value="az">{t('dashboard.filters.azPassage')}</SelectItem>
                    <SelectItem value="progress">{t('dashboard.filters.byProgress')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};
