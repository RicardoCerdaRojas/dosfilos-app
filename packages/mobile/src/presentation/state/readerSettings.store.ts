import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReaderSettingsState {
    fontSize: number;
    setFontSize: (size: number) => void;
}

export const useReaderSettingsStore = create<ReaderSettingsState>()(
    persist(
        (set) => ({
            fontSize: 18, // Default font size
            setFontSize: (size: number) => set({ fontSize: size }),
        }),
        {
            name: 'reader-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
