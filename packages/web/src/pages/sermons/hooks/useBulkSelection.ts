import { useCallback, useMemo, useState } from 'react';

/**
 * Generic multi-select state for any list-of-id surface.
 *
 * Built for the sermons list page (PR `sermons-bulk-delete`) so the user
 * can bulk-delete from "Sermones" + "Estudios en curso" without clicking
 * row-by-row. Kept generic so the same hook can drive future bulk surfaces
 * (extractions, library docs, etc.) without duplication.
 *
 * Selection mode is implicit — the bar appears whenever `count > 0`, so
 * the user enters "select mode" simply by ticking the first checkbox.
 * `clear()` exits it. No explicit toggle button needed.
 */
export interface BulkSelectionApi {
    selected: ReadonlySet<string>;
    count: number;
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectMany: (ids: string[]) => void;
    clear: () => void;
    /** True when every id in `pool` is selected (used to drive "Select all"). */
    allSelected: (pool: string[]) => boolean;
    /** Convenience: toggle "select all / clear" for the given pool. */
    toggleAll: (pool: string[]) => void;
}

export function useBulkSelection(): BulkSelectionApi {
    const [selected, setSelected] = useState<Set<string>>(() => new Set());

    const toggle = useCallback((id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectMany = useCallback((ids: string[]) => {
        setSelected((prev) => {
            const next = new Set(prev);
            for (const id of ids) next.add(id);
            return next;
        });
    }, []);

    const clear = useCallback(() => setSelected(new Set()), []);

    const isSelected = useCallback((id: string) => selected.has(id), [selected]);

    const allSelected = useCallback(
        (pool: string[]) => pool.length > 0 && pool.every((id) => selected.has(id)),
        [selected],
    );

    const toggleAll = useCallback(
        (pool: string[]) => {
            setSelected((prev) => {
                const allIn = pool.length > 0 && pool.every((id) => prev.has(id));
                if (allIn) {
                    const next = new Set(prev);
                    for (const id of pool) next.delete(id);
                    return next;
                }
                const next = new Set(prev);
                for (const id of pool) next.add(id);
                return next;
            });
        },
        [],
    );

    return useMemo(
        () => ({
            selected,
            count: selected.size,
            isSelected,
            toggle,
            selectMany,
            clear,
            allSelected,
            toggleAll,
        }),
        [selected, isSelected, toggle, selectMany, clear, allSelected, toggleAll],
    );
}
