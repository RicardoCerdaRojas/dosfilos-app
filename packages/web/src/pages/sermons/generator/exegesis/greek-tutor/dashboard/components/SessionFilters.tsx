import React from 'react';
import { Filter } from 'lucide-react';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
    return (
        <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Progress Filter */}
            <Select value={progressFilter} onValueChange={(value) => onProgressFilterChange(value as ProgressFilter)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por progreso" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="empty">Vacías (0%)</SelectItem>
                    <SelectItem value="started">Iniciadas (1-50%)</SelectItem>
                    <SelectItem value="half">Avanzadas (51-99%)</SelectItem>
                    <SelectItem value="complete">Completadas (100%)</SelectItem>
                </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as SortBy)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date-desc">Más reciente</SelectItem>
                    <SelectItem value="date-asc">Más antiguo</SelectItem>
                    <SelectItem value="az">A-Z (Pasaje)</SelectItem>
                    <SelectItem value="progress">Por progreso</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};
