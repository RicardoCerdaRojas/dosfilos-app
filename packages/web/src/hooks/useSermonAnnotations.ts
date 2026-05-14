import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { sermonService } from '@dosfilos/application';
import type { AnnotationSnapshot } from '@/adapters/DrawingEngineAdapter';

export function useSermonAnnotations(sermonId: string | undefined) {
    const [initialSnapshot, setInitialSnapshot] = useState<AnnotationSnapshot | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Create stable debounced save function using ref
    const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

    // Initialize debounced function once. The service serializes to
    // JSON internally (Firestore rejects nested arrays), so we hand
    // it the snapshot object directly.
    if (!debouncedSaveRef.current) {
        debouncedSaveRef.current = debounce(async (sid: string, snapshot: AnnotationSnapshot) => {
            try {
                await sermonService.saveAnnotationSnapshot(sid, snapshot);
            } catch (error) {
                console.error('[useSermonAnnotations] Error saving annotations:', error);
            }
        }, 1000);
    }

    // Load initial data (Once)
    useEffect(() => {
        if (!sermonId) {
            setLoading(false);
            return;
        }

        const fetchAnnotations = async () => {
            try {
                const snapshot = await sermonService.getAnnotationSnapshot(sermonId);
                if (snapshot) {
                    setInitialSnapshot(snapshot as AnnotationSnapshot);
                }
            } catch (error) {
                console.error('[useSermonAnnotations] Error fetching annotations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnotations();

        // We do NOT subscribe to updates here to avoid circular updates
        // resetting the editor state while the user is editing.
    }, [sermonId]);

    // Stable save function wrapper
    const saveSnapshot = useCallback((snapshot: AnnotationSnapshot) => {
        if (!sermonId || !debouncedSaveRef.current) return;
        debouncedSaveRef.current(sermonId, snapshot);
    }, [sermonId]);

    return {
        initialSnapshot,
        loading,
        saveSnapshot
    };
}
