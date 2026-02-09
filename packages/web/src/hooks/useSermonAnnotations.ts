import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { debounce } from 'lodash';
import type { AnnotationSnapshot } from '@/adapters/DrawingEngineAdapter';

const db = getFirestore();

export function useSermonAnnotations(sermonId: string | undefined) {
    const [initialSnapshot, setInitialSnapshot] = useState<AnnotationSnapshot | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Create stable debounced save function using ref
    const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

    // Initialize debounced function once
    if (!debouncedSaveRef.current) {
        debouncedSaveRef.current = debounce(async (sid: string, snapshot: AnnotationSnapshot) => {
            try {
                // Firestore doesn't support nested arrays, so we store as JSON string
                const snapshotJSON = JSON.stringify(snapshot);

                await setDoc(doc(db, 'sermons', sid, 'annotations', 'main'), {
                    snapshotJSON,
                    updatedAt: new Date(),
                });
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
                const docRef = doc(db, 'sermons', sermonId, 'annotations', 'main');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Try new JSON format first, fallback to old format
                    if (data.snapshotJSON) {
                        const snapshot = JSON.parse(data.snapshotJSON) as AnnotationSnapshot;
                        setInitialSnapshot(snapshot);
                    } else if (data.snapshot) {
                        setInitialSnapshot(data.snapshot as AnnotationSnapshot);
                    }
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
