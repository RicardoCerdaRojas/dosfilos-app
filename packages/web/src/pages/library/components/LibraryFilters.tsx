import { useTranslation } from '@/i18n';
import { LibraryCategory, ResourceType } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, List, Search } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

interface LibraryFiltersProps {
    /** Categories for the filter dropdown. */
    categories: LibraryCategory[];
    /** Current search query. */
    searchQuery: string;
    /** Current category filter (or 'all'). */
    categoryFilter: ResourceType | 'all';
    /** Active view mode (grid or list). */
    viewMode: ViewMode;
    /** Search input change handler. */
    onSearchChange: (query: string) => void;
    /** Category filter change handler. */
    onCategoryChange: (filter: ResourceType | 'all') => void;
    /** View mode change handler. */
    onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Slim filter row: search input + category dropdown + grid/list toggle.
 * No internal state — pure controlled inputs delegated to parent.
 */
export function LibraryFilters({
    categories,
    searchQuery,
    categoryFilter,
    viewMode,
    onSearchChange,
    onCategoryChange,
    onViewModeChange,
}: LibraryFiltersProps) {
    const { t } = useTranslation('library');

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    placeholder={t('filters.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => onCategoryChange(v as ResourceType | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex gap-0.5 border border-border/60 rounded-lg p-0.5 sm:ml-auto">
                <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('grid')}
                    className="h-7 w-7 p-0"
                    title={t('filters.viewGridTitle')}
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('list')}
                    className="h-7 w-7 p-0"
                    title={t('filters.viewListTitle')}
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
