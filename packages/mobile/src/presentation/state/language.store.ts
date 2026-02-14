import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type Language = 'es' | 'en';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
}

// Default to device language if it's one of the supported ones, otherwise Spanish
const getDeviceLanguage = (): Language => {
    const deviceLanguage = Localization.getLocales()[0].languageCode;
    return deviceLanguage === 'en' ? 'en' : 'es';
};

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            language: getDeviceLanguage(),
            setLanguage: (lang: Language) => set({ language: lang }),
        }),
        {
            name: 'language-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
