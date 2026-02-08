import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { debounce } from 'lodash';
import { TLStoreSnapshot } from 'tldraw';

const db = getFirestore();

export function useSermonAnnotations(sermonId: string | undefined) {
    const [initialSnapshot, setInitialSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
    const [loading, setLoading] = useState(true);

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

    // Save function
    const saveSnapshot = useCallback(
        debounce(async (snapshot: TLStoreSnapshot) => {
            if (!sermonId) return;

            const recordCount = snapshot.store ? Object.keys(snapshot.store).length : 0;
            console.log('[useSermonAnnotations] SAVING snapshot with', recordCount, 'records to Firestore');

            try {
                await setDoc(doc(db, 'sermons', sermonId, 'annotations', 'main'), {
                    snapshot,
                    updatedAt: new Date(),
                });
                console.log('[useSermonAnnotations] Save successful');
            } catch (error) {
                console.error('[useSermonAnnotations] Error saving annotations:', error);
            }
        }, 1000),
        [sermonId]
    );

    return {
        initialSnapshot,
        loading,
        saveSnapshot
    };
}
