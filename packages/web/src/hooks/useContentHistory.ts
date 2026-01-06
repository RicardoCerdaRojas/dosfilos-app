import { useState, useCallback, useEffect } from 'react';

/**
 * Represents a single version of a section's content
 */
export interface SectionVersion {
    id: string;
    sectionId: string;
    content: any;
    timestamp: Date;
    changeDescription: string;
    aiSuggestion?: string;
}

/**
 * History state for all sections
 */
export interface ContentHistory {
    [sectionId: string]: SectionVersion[];
}

/**
 * Hook for managing content history with undo/redo and persistence
 */
export function useContentHistory(
    contentType: string,
    contentId?: string
) {
    const [history, setHistory] = useState<ContentHistory>({});
    const [currentVersionIndex, setCurrentVersionIndex] = useState<Record<string, number>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Generate storage key for localStorage
    const getStorageKey = useCallback(() => {
        if (!contentId) return null;
        return `content-history-${contentType}-${contentId}`;
    }, [contentType, contentId]);

    // Load history from localStorage on mount
    useEffect(() => {
        const storageKey = getStorageKey();
        if (!storageKey) {
            setIsLoaded(true);
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert timestamp strings back to Date objects
                const historyWithDates: ContentHistory = {};
                Object.keys(parsed).forEach(sectionId => {
                    const sectionVersions = parsed[sectionId];
                    if (Array.isArray(sectionVersions)) {
                        historyWithDates[sectionId] = sectionVersions.map((v: any) => ({
                            ...v,
                            timestamp: new Date(v.timestamp)
                        }));
                    }
                });

                setHistory(historyWithDates);

                // Initialize current version indices
                const indices: Record<string, number> = {};
                Object.keys(historyWithDates).forEach(sectionId => {
                    const sectionHistory = historyWithDates[sectionId];
                    if (sectionHistory) {
                        indices[sectionId] = sectionHistory.length - 1;
                    }
                });
                setCurrentVersionIndex(indices);
            }
        } catch (error) {
            console.error('Failed to load history from localStorage:', error);
        } finally {
            setIsLoaded(true);
        }
    }, [getStorageKey]);

    // Save history to localStorage whenever it changes (but only after initial load)
    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        const storageKey = getStorageKey();
        if (!storageKey) return;

        try {
            localStorage.setItem(storageKey, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save history to localStorage:', error);
        }
    }, [history, getStorageKey, isLoaded]);

    /**
     * Save a new version of a section
     */
    const saveVersion = useCallback((
        sectionId: string,
        content: any,
        changeDescription: string,
        aiSuggestion?: string
    ) => {
        const version: SectionVersion = {
            id: `${sectionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sectionId,
            content: JSON.parse(JSON.stringify(content)), // Deep clone
            timestamp: new Date(),
            changeDescription,
            aiSuggestion
        };

        setHistory(prev => {
            const sectionHistory = prev[sectionId] || [];
            const currentIndex = currentVersionIndex[sectionId] ?? -1;

            // If we're not at the latest version, remove future versions
            const newHistory = currentIndex >= 0
                ? sectionHistory.slice(0, currentIndex + 1)
                : sectionHistory;

            const updatedHistory = {
                ...prev,
                [sectionId]: [...newHistory, version]
            };

            return updatedHistory;
        });

        setCurrentVersionIndex(prev => ({
            ...prev,
            [sectionId]: (prev[sectionId] ?? -1) + 1
        }));

        return version;
    }, [currentVersionIndex]);

    /**
   * Undo to previous version
   */
    const undo = useCallback((sectionId: string): SectionVersion | null => {
        const sectionHistory = history[sectionId];
        if (!sectionHistory || sectionHistory.length === 0) return null;

        const currentIndex = currentVersionIndex[sectionId] ?? sectionHistory.length - 1;
        if (currentIndex <= 0) return null; // Can't undo further

        const newIndex = currentIndex - 1;
        setCurrentVersionIndex(prev => ({
            ...prev,
            [sectionId]: newIndex
        }));

        const version = sectionHistory[newIndex];
        return version ?? null;
    }, [history, currentVersionIndex]);

    /**
     * Redo to next version
     */
    const redo = useCallback((sectionId: string): SectionVersion | null => {
        const sectionHistory = history[sectionId];
        if (!sectionHistory || sectionHistory.length === 0) return null;

        const currentIndex = currentVersionIndex[sectionId] ?? -1;
        if (currentIndex >= sectionHistory.length - 1) return null; // Can't redo further

        const newIndex = currentIndex + 1;
        setCurrentVersionIndex(prev => ({
            ...prev,
            [sectionId]: newIndex
        }));

        const version = sectionHistory[newIndex];
        return version ?? null;
    }, [history, currentVersionIndex]);


    /**
     * Get all versions for a section
     */
    const getVersions = useCallback((sectionId: string): SectionVersion[] => {
        return history[sectionId] || [];
    }, [history]);

    /**
   * Get current version for a section
   */
    const getCurrentVersion = useCallback((sectionId: string): SectionVersion | null => {
        const sectionHistory = history[sectionId];
        if (!sectionHistory || sectionHistory.length === 0) return null;

        const currentIndex = currentVersionIndex[sectionId] ?? sectionHistory.length - 1;
        const version = sectionHistory[currentIndex];
        return version ?? null;
    }, [history, currentVersionIndex]);

    /**
     * Jump to a specific version
     */
    const goToVersion = useCallback((sectionId: string, versionId: string): SectionVersion | null => {
        const sectionHistory = history[sectionId];
        if (!sectionHistory) return null;

        const versionIndex = sectionHistory.findIndex(v => v.id === versionId);
        if (versionIndex === -1) return null;

        setCurrentVersionIndex(prev => ({
            ...prev,
            [sectionId]: versionIndex
        }));

        const version = sectionHistory[versionIndex];
        return version ?? null;
    }, [history]);


    /**
     * Check if can undo
     */
    const canUndo = useCallback((sectionId: string): boolean => {
        const currentIndex = currentVersionIndex[sectionId] ?? -1;
        return currentIndex > 0;
    }, [currentVersionIndex]);

    /**
     * Check if can redo
     */
    const canRedo = useCallback((sectionId: string): boolean => {
        const sectionHistory = history[sectionId];
        if (!sectionHistory) return false;

        const currentIndex = currentVersionIndex[sectionId] ?? sectionHistory.length - 1;
        return currentIndex < sectionHistory.length - 1;
    }, [history, currentVersionIndex]);

    /**
     * Clear history for a section
     */
    const clearHistory = useCallback((sectionId: string) => {
        setHistory(prev => {
            const newHistory = { ...prev };
            delete newHistory[sectionId];
            return newHistory;
        });
        setCurrentVersionIndex(prev => {
            const newIndices = { ...prev };
            delete newIndices[sectionId];
            return newIndices;
        });
    }, []);

    /**
     * Clear all history
     */
    const clearAllHistory = useCallback(() => {
        setHistory({});
        setCurrentVersionIndex({});

        const storageKey = getStorageKey();
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
    }, [getStorageKey]);

    return {
        history,
        saveVersion,
        undo,
        redo,
        getVersions,
        getCurrentVersion,
        goToVersion,
        canUndo,
        canRedo,
        clearHistory,
        clearAllHistory
    };
}
