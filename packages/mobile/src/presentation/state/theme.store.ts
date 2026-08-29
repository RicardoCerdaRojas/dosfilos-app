import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * `eink` no es un cuarto color: es el modo para lectores de tinta electrónica
 * (Boox), donde los rellenos suaves no existen y todo se resuelve con borde.
 */
export type ThemeMode = 'light' | 'dark' | 'system' | 'eink';

interface ThemeState {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            themeMode: 'system',
            setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
