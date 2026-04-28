import React, { useCallback, useEffect, useRef, useState } from 'react';

type DragDirection = 'left' | 'right';

interface DragResizeResult {
    width: number;
    isDragging: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
}

function useDragResize(
    direction: DragDirection,
    storageKey: string,
    defaultWidth: number,
    minWidth: number,
    maxWidth: number,
): DragResizeResult {
    const [width, setWidth] = useState<number>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? Math.min(maxWidth, Math.max(minWidth, parseInt(stored, 10))) : defaultWidth;
        } catch {
            return defaultWidth;
        }
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef<number>(0);
    const dragStartW = useRef<number>(0);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartX.current = e.clientX;
        dragStartW.current = width;
        setIsDragging(true);
    }, [width]);

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => {
            const delta = direction === 'left'
                ? dragStartX.current - e.clientX
                : e.clientX - dragStartX.current;
            const next = Math.min(maxWidth, Math.max(minWidth, dragStartW.current + delta));
            setWidth(next);
        };

        const onMouseUp = () => {
            setIsDragging(false);
            try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, maxWidth, minWidth, storageKey, width, direction]);

    useEffect(() => {
        if (!isDragging) {
            try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
        }
    }, [width, isDragging, storageKey]);

    return { width, isDragging, onMouseDown };
}

export function useDragResizeLeft(storageKey: string, defaultWidth: number, minWidth: number, maxWidth: number): DragResizeResult {
    return useDragResize('left', storageKey, defaultWidth, minWidth, maxWidth);
}

export function useDragResizeRight(storageKey: string, defaultWidth: number, minWidth: number, maxWidth: number): DragResizeResult {
    return useDragResize('right', storageKey, defaultWidth, minWidth, maxWidth);
}
