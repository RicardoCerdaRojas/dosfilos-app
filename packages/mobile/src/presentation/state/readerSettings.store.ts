import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { READING_MODES, ReadingMode, ReadingModeTokens } from '@/core/theme/readingModes';

interface ReaderSettingsState {
    fontSize: number;
    setFontSize: (size: number) => void;
    /** Modo de luz del lector/púlpito (plan §6). Persistido; sync llega en F1. */
    readingMode: ReadingMode;
    setReadingMode: (mode: ReadingMode) => void;
}

export const useReaderSettingsStore = create<ReaderSettingsState>()(
    persist(
        (set) => ({
            fontSize: 18, // Default font size
            setFontSize: (size: number) => set({ fontSize: size }),
            readingMode: 'claro',
            setReadingMode: (mode: ReadingMode) => set({ readingMode: mode }),
        }),
        {
            name: 'reader-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

/** Tokens del modo activo — el consumo de F1 pasa por aquí, no por READING_MODES directo. */
export function useReadingModeTokens(): ReadingModeTokens {
    const mode = useReaderSettingsStore((s) => s.readingMode);
    return READING_MODES[mode];
}
