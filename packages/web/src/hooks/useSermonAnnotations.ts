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
                    if (data.snapshot) {
                        setInitialSnapshot(data.snapshot as TLStoreSnapshot);
                    }
                }
            } catch (error) {
                console.error('Error fetching annotations:', error);
            } finally {
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

            try {
                await setDoc(doc(db, 'sermons', sermonId, 'annotations', 'main'), {
                    snapshot,
                    updatedAt: new Date(),
                });
            } catch (error) {
                console.error('Error saving annotations:', error);
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
