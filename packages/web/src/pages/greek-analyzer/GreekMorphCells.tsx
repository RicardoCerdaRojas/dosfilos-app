import { cn } from '@/lib/utils';
import type { MorphCell } from './useMorphCells';

interface Props {
    cells: MorphCell[];
    /** El popover aprieta más que la tarjeta. */
    compact?: boolean;
}

/**
 * La rejilla de celdas morfológicas.
 *
 * `auto-fit` + `minmax` y NO columnas fijas: con una rejilla rígida un valor
 * largo ("Imperativo", "Subjuntivo") desbordaba su columna y el contenedor
 * ganaba scroll horizontal — el peor en un panel de lectura, porque esconde
 * texto sin avisar.
 */
export function GreekMorphCells({ cells, compact }: Props) {
    if (cells.length === 0) return null;
    return (
        <div
            className={cn('grid', compact ? 'gap-1' : 'gap-1.5')}
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? '5.5rem' : '6rem'}, 1fr))` }}
        >
            {cells.map((c) => (
                <div
                    key={c.label}
                    className={cn('min-w-0 rounded border border-border/60', compact ? 'px-1.5 py-1' : 'px-2 py-1.5')}
                >
                    <div className={cn('uppercase tracking-wide text-muted-foreground', compact ? 'text-[9px]' : 'text-[10px]')}>
                        {c.label}
                    </div>
                    <div className={cn('break-words', compact ? 'text-xs leading-tight' : 'text-sm')}>{c.value}</div>
                </div>
            ))}
        </div>
    );
}
