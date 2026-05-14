import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RailDividerProps {
    /** Which rail this divider belongs to. Drives chevron direction
     *  and the sign of resize deltas. */
    side: 'left' | 'right';
    isOpen: boolean;
    onToggle: () => void;
    /**
     * Drag-resize callback. Receives the cursor delta in pixels:
     * positive when the user is widening the rail, negative when
     * shrinking. Caller clamps to its min/max. Pass `undefined` to
     * disable drag (e.g. when the rail is closed — only click/toggle
     * makes sense).
     */
    onResize?: (deltaPx: number) => void;
    /** Drag threshold in pixels — under this counts as a click. */
    clickThreshold?: number;
    title?: string;
}

/**
 * Rail divider in the VSCode pattern: a vertical line at the
 * boundary between a side rail and the main content. Single
 * affordance for two interactions:
 *
 *   - Click (mouse-down then up without moving past the threshold)
 *     → toggles the rail open/closed.
 *   - Drag (mouse-down + drag past the threshold) → resizes the
 *     rail width via `onResize` deltas. Caller owns the width state
 *     + clamping.
 *
 * Replaces the previous floating edge-tabs that sat on `fixed
 * left-0` / `fixed right-0` and overlapped the global app sidebar.
 * This divider lives inline in the chat's flex row so it sits
 * exactly on the rail boundary regardless of app shell width.
 */
export function RailDivider({
    side,
    isOpen,
    onToggle,
    onResize,
    clickThreshold = 4,
    title,
}: RailDividerProps) {
    // Ref-based drag state so listeners don't re-render us mid-drag.
    const dragRef = useRef<{ startX: number; lastX: number; hasMoved: boolean } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Left mouse button only.
        if (e.button !== 0) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, lastX: e.clientX, hasMoved: false };

        const handleMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const totalDelta = Math.abs(ev.clientX - dragRef.current.startX);
            if (totalDelta > clickThreshold) dragRef.current.hasMoved = true;
            if (dragRef.current.hasMoved && onResize) {
                const stepDelta = ev.clientX - dragRef.current.lastX;
                // For the right rail, the resize axis is mirrored —
                // dragging cursor right SHRINKS the rail, dragging
                // left WIDENS it. Flip the sign so callers always
                // receive "positive = widen".
                onResize(side === 'left' ? stepDelta : -stepDelta);
                dragRef.current.lastX = ev.clientX;
            }
        };

        const handleUp = () => {
            const wasClick = dragRef.current && !dragRef.current.hasMoved;
            dragRef.current = null;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (wasClick) onToggle();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        // Lock cursor + prevent text selection during drag.
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // Chevron rule: button shows the direction the user can collapse
    // toward — open left rail collapses leftward (←), closed left
    // rail expands rightward (→). Same logic mirrored for right rail.
    const Icon = side === 'left'
        ? (isOpen ? ChevronLeft : ChevronRight)
        : (isOpen ? ChevronRight : ChevronLeft);

    return (
        <div
            onMouseDown={handleMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label={title}
            title={title}
            className={cn(
                // Hairline divider that thickens slightly on hover.
                // Cursor signals drag affordance; click handling lives
                // in onMouseDown via the threshold check.
                'group relative hidden md:flex shrink-0 w-1 cursor-col-resize transition-colors',
                isOpen
                    ? 'bg-border hover:bg-primary/40 active:bg-primary/60'
                    // Closed: bar stays subtle until hovered so it
                    // doesn't compete with the main content edge.
                    : 'bg-transparent hover:bg-primary/30',
            )}
        >
            {/*
             * Chevron handle — purely visual indicator, layered above
             * the divider with `pointer-events-none` so the click +
             * drag still goes to the parent div. Keeps interaction
             * model simple: one element handles both gestures.
             */}
            <span
                className={cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 z-10',
                    side === 'left' ? '-right-2' : '-left-2',
                    'h-12 w-4 rounded-md border border-border bg-card shadow-sm',
                    'flex items-center justify-center',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                )}
            >
                <Icon className="w-3 h-3 text-muted-foreground" />
            </span>
        </div>
    );
}
