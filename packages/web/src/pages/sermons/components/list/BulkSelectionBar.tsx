import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    count: number;
    onClear: () => void;
    onDelete: () => void;
    deleting?: boolean;
    /** Pool size shown next to the "select all" affordance. */
    poolSize: number;
    allSelected: boolean;
    onToggleAll: () => void;
    /** Optional label override (defaults to "seleccionados"). */
    label?: string;
}

/**
 * Sticky action bar that surfaces when the user has selected any sermon
 * on the list. Two CTAs — clear selection + bulk delete (with confirm
 * upstream). Kept dumb on purpose: parent owns the delete flow + the
 * dialog so the bar can be reused inside both list tabs without leaking
 * state into a generic component.
 */
export function BulkSelectionBar({
    count,
    onClear,
    onDelete,
    deleting = false,
    poolSize,
    allSelected,
    onToggleAll,
    label = 'seleccionados',
}: Props) {
    if (count === 0) return null;

    return (
        <div
            className={cn(
                'sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card/95 px-3 py-2 shadow-sm backdrop-blur',
            )}
            data-testid="sermons-bulk-selection-bar"
        >
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    aria-label={allSelected ? 'Quitar selección de todos' : 'Seleccionar todos'}
                />
                <span className="text-sm font-medium">
                    {count} {label}{' '}
                    <span className="text-muted-foreground">de {poolSize}</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClear} disabled={deleting}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    disabled={deleting}
                    data-testid="sermons-bulk-delete-button"
                >
                    {deleting ? (
                        <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Eliminando…
                        </>
                    ) : (
                        <>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Eliminar ({count})
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
