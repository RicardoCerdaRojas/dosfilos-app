import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { debounce } from 'lodash';
import { TLStoreSnapshot } from 'tldraw';

const db = getFirestore();

export function useSermonAnnotations(sermonId: string | undefined) {
    const [initialSnapshot, setInitialSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Create stable debounced save function using ref
    const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

    // Initialize debounced function once
    if (!debouncedSaveRef.current) {
        debouncedSaveRef.current = debounce(async (sid: string, snapshot: TLStoreSnapshot) => {
            const recordCount = snapshot.store ? Object.keys(snapshot.store).length : 0;
            console.log('[useSermonAnnotations] SAVING snapshot with', recordCount, 'records to Firestore');

            try {
                await setDoc(doc(db, 'sermons', sid, 'annotations', 'main'), {
                    snapshot,
                    updatedAt: new Date(),
                });
                console.log('[useSermonAnnotations] Save successful');
            } catch (error) {
                console.error('[useSermonAnnotations] Error saving annotations:', error);
            }
        }, 1000);
    }

    // Load initial data (Once)
    useEffect(() => {
        console.log('[useSermonAnnotations] Effect triggered for sermonId:', sermonId);
        if (!sermonId) {
            setLoading(false);
            return;
        }

        const fetchAnnotations = async () => {
            try {
                const docRef = doc(db, 'sermons', sermonId, 'annotations', 'main');
                console.log('[useSermonAnnotations] Fetching from:', docRef.path);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.snapshot) {
                        const recordCount = data.snapshot.store ? Object.keys(data.snapshot.store).length : 0;
                        console.log('[useSermonAnnotations] Loaded snapshot with', recordCount, 'records');
                        setInitialSnapshot(data.snapshot as TLStoreSnapshot);
                    } else {
                        console.log('[useSermonAnnotations] Document exists but no snapshot field');
                    }
                } else {
                    console.log('[useSermonAnnotations] No existing annotations document');
                }
            } catch (error) {
                console.error('[useSermonAnnotations] Error fetching annotations:', error);
            } finally {
                console.log('[useSermonAnnotations] Fetch complete, setting loading to false');
                setLoading(false);
            }
        };

        fetchAnnotations();

        // We do NOT subscribe to updates here to avoid circular updates 
        // resetting the editor state while the user is editing.
    }, [sermonId]);

    // Stable save function wrapper
    const saveSnapshot = useCallback((snapshot: TLStoreSnapshot) => {
        if (!sermonId || !debouncedSaveRef.current) return;
        debouncedSaveRef.current(sermonId, snapshot);
    }, [sermonId]);

    return {
        initialSnapshot,
        loading,
        saveSnapshot
    };
}
