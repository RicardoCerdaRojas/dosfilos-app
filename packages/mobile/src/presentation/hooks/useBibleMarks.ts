import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    setDoc,
} from '@react-native-firebase/firestore';
import type { HighlightColor, MarkStyle } from '@dosfilos/domain';

import { getFirebaseAuth, getFirebaseDb } from '@/data/sources/firebase.source';
import type { BibleMark } from '@/domain/bible/entities/BibleMark';
import { verseKey } from '@/domain/bible/entities/BibleMark';

/**
 * Marcas sobre el texto bíblico, por usuario.
 *
 * Viven en `users/{uid}/bibleMarks` y no en el sermón: una marca sobre Jonás
 * 1:3 es del pastor, no de un sermón en particular, y tiene que seguir ahí
 * cuando abra ese pasaje dos años después preparando otro.
 */
const marksRef = () => {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return null;
    return collection(getFirebaseDb(), 'users', uid, 'bibleMarks');
};

export const useBibleMarks = () => {
    const query = useQuery({
        queryKey: ['bibleMarks'],
        queryFn: async (): Promise<Map<string, BibleMark>> => {
            const ref = marksRef();
            if (!ref) return new Map();
            const snap = await getDocs(ref);
            const map = new Map<string, BibleMark>();
            snap.docs.forEach((d) => {
                const data = d.data() as any;
                const mark: BibleMark = {
                    id: d.id,
                    versionId: String(data.versionId ?? ''),
                    bookId: String(data.bookId ?? ''),
                    chapter: Number(data.chapter ?? 0),
                    verse: Number(data.verse ?? 0),
                    color: data.color,
                    style: data.style ?? 'highlight',
                    createdAt: data.createdAt?.toDate?.() ?? new Date(),
                };
                map.set(verseKey(mark.bookId, mark.chapter, mark.verse), mark);
            });
            return map;
        },
        staleTime: Infinity,
    });

    return query;
};

export const useBibleMarkMutations = () => {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['bibleMarks'] });

    const set = useMutation({
        mutationFn: async (input: {
            versionId: string;
            bookId: string;
            chapter: number;
            verses: number[];
            color: HighlightColor;
            style: MarkStyle;
        }) => {
            const ref = marksRef();
            if (!ref) return;
            // Un documento por versículo: el id ES la dirección, así que
            // volver a marcar el mismo versículo reemplaza en vez de duplicar.
            await Promise.all(
                input.verses.map((verse) => {
                    const id = verseKey(input.bookId, input.chapter, verse);
                    return setDoc(doc(ref, id), {
                        versionId: input.versionId,
                        bookId: input.bookId,
                        chapter: input.chapter,
                        verse,
                        color: input.color,
                        style: input.style,
                        createdAt: serverTimestamp(),
                    }).catch((error) => console.warn(`[bibleMarks] ${id} failed:`, error));
                }),
            );
        },
        onSuccess: refresh,
    });

    const clear = useMutation({
        mutationFn: async (input: { bookId: string; chapter: number; verses: number[] }) => {
            const ref = marksRef();
            if (!ref) return;
            await Promise.all(
                input.verses.map((verse) =>
                    deleteDoc(doc(ref, verseKey(input.bookId, input.chapter, verse))).catch(
                        () => undefined,
                    ),
                ),
            );
        },
        onSuccess: refresh,
    });

    return { set, clear };
};
