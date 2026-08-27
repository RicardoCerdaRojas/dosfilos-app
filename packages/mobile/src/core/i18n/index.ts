import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import locales
import commonEs from './locales/es/common.json';
import commonEn from './locales/en/common.json';
import homeEs from './locales/es/home.json';
import homeEn from './locales/en/home.json';
import bibleEs from './locales/es/bible.json';
import bibleEn from './locales/en/bible.json';
import sermonsEs from './locales/es/sermons.json';
import sermonsEn from './locales/en/sermons.json';

const resources = {
    es: {
        common: commonEs,
        home: homeEs,
        bible: bibleEs,
        sermons: sermonsEs,
    },
    en: {
        common: commonEn,
        home: homeEn,
        bible: bibleEn,
        sermons: sermonsEn,
    },
};

// Detect device language
const deviceLanguage = Localization.getLocales()[0].languageCode || 'es';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: deviceLanguage, // Initial language
        fallbackLng: 'es',
        ns: ['common', 'home', 'bible', 'sermons'],
        defaultNS: 'common',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        react: {
            useSuspense: false, // Avoid issues with React Native Suspense
        },
    });

export default i18n;
