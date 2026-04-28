import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { UserSortOptions } from '@dosfilos/domain';

interface SortableHeaderProps {
    label: string;
    field: UserSortOptions['field'];
    currentSort: UserSortOptions | null;
    onSort: (field: UserSortOptions['field']) => void;
    align?: 'left' | 'right';
    className?: string;
}

/**
 * Clickable table header that toggles sort direction on the given field.
 * First click → ascending, second click → descending, third click → reset
 * (no sort). Visually shows arrow up/down/double when active/inactive so
 * the admin can read the current sort at a glance.
 */
export function SortableHeader({
    label,
    field,
    currentSort,
    onSort,
    align = 'left',
    className,
}: SortableHeaderProps) {
    const isActive = currentSort?.field === field;
    const direction = isActive ? currentSort.direction : null;

    const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;

    return (
        <TableHead className={cn(align === 'right' && 'text-right', className)}>
            <button
                type="button"
                onClick={() => onSort(field)}
                className={cn(
                    'inline-flex items-center gap-1 font-medium select-none transition-colors',
                    align === 'right' && 'flex-row-reverse',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
            >
                {label}
                <Icon className={cn('h-3 w-3', !isActive && 'opacity-40')} />
            </button>
        </TableHead>
    );
}
