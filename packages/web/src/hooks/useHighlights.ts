import { useState, useEffect, useCallback } from 'react';

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue';

export interface Highlight {
    id: string;
    text: string;
    color: HighlightColor;
    startOffset: number;
    endOffset: number;
}

export function useHighlights(sermonId: string) {
    const storageKey = `sermon-${sermonId}-highlights`;

    const [highlights, setHighlights] = useState<Highlight[]>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const [selectedText, setSelectedText] = useState<{
        text: string;
        range: Range;
    } | null>(null);

    // Save to localStorage whenever highlights change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(highlights));
        } catch (error) {
            console.error('Failed to save highlights:', error);
        }
    }, [highlights, storageKey]);

    const addHighlight = useCallback((color: HighlightColor) => {
        if (!selectedText || !selectedText.text.trim()) return;

        const newHighlight: Highlight = {
            id: `highlight-${Date.now()}-${Math.random()}`,
            text: selectedText.text,
            color,
            startOffset: 0, // Will be calculated by component
            endOffset: 0,
        };

        setHighlights(prev => [...prev, newHighlight]);
        setSelectedText(null);

        // Clear selection
        window.getSelection()?.removeAllRanges();
    }, [selectedText]);

    const removeHighlight = useCallback((id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
    }, []);

    const clearAllHighlights = useCallback(() => {
        setHighlights([]);
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    // Handle text selection
    useEffect(() => {
        let selectionTimeout: NodeJS.Timeout;

        const handleSelection = () => {
            // Small delay to ensure selection is ready on mobile/tablet
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(() => {
                const selection = window.getSelection();
                const text = selection?.toString().trim();

                if (text && text.length > 0) {
                    const range = selection?.getRangeAt(0);
                    if (range) {
                        setSelectedText({ text, range });
                    }
                } else {
                    setSelectedText(null);
                }
            }, 100);
        };

        // Mouse events for desktop
        document.addEventListener('mouseup', handleSelection);
        // Touch events for mobile/tablet
        document.addEventListener('touchend', handleSelection);
        // Selection change for better mobile support
        document.addEventListener('selectionchange', handleSelection);

        return () => {
            clearTimeout(selectionTimeout);
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
            document.removeEventListener('selectionchange', handleSelection);
        };
    }, []);

    return {
        highlights,
        selectedText,
        addHighlight,
        removeHighlight,
        clearAllHighlights,
    };
}
