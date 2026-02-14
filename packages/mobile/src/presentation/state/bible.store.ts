import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

interface BibleState {
    versionId: string;
    secondaryVersionId: string | null;
    isParallelMode: boolean;
    bookId: string;
    bookName: string;
    chapter: number;

    // Actions
    setVersion: (versionId: string) => void;
    setSecondaryVersion: (versionId: string | null) => void;
    toggleParallelMode: () => void;
    setBook: (bookId: string, bookName: string) => void;
    setChapter: (chapter: number) => void;
    nextChapter: () => void;
    prevChapter: () => void;
}

export const useBibleStore = create<BibleState>()(
    persist(
        (set, get) => ({
            versionId: 'RVR1960',
            secondaryVersionId: null,
            isParallelMode: false,
            bookId: 'GEN',
            bookName: 'Génesis',
            chapter: 1,

            setVersion: (versionId) => set({ versionId }),

            setSecondaryVersion: (secondaryVersionId) => set({ secondaryVersionId }),

            toggleParallelMode: () => set((state) => ({
                isParallelMode: !state.isParallelMode,
                // Automatically set a secondary version if none is selected when enabling
                secondaryVersionId: !state.isParallelMode && !state.secondaryVersionId
                    ? (state.versionId === 'RVR1960' ? 'ASV' : 'RVR1960')
                    : state.secondaryVersionId
            })),

            setBook: (bookId, bookName) => set({ bookId, bookName, chapter: 1 }),

            setChapter: (chapter) => set({ chapter }),

            nextChapter: () => {
                const { versionId, bookId, chapter } = get();
                const repository = BibleVersionFactory.getByVersion(versionId);
                const bookChapters = repository.getChapterCount(bookId);

                if (chapter < bookChapters) {
                    set({ chapter: chapter + 1 });
                }
            },

            prevChapter: () => {
                const { chapter } = get();
                if (chapter > 1) {
                    set({ chapter: chapter - 1 });
                }
            },
        }),
        {
            name: 'bible-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
