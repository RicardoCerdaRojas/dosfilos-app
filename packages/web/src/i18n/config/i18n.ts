/**
 * i18next Configuration
 * 
 * Central configuration for internationalization system.
 * Following Dependency Inversion Principle - depends on abstractions (i18next interface)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '../types';

// Import translations
import commonEn from '../locales/en/common.json';
import commonEs from '../locales/es/common.json';
import landingEn from '../locales/en/landing.json';
import landingEs from '../locales/es/landing.json';
import navigationEn from '../locales/en/navigation.json';
import navigationEs from '../locales/es/navigation.json';
import authEn from '../locales/en/auth.json';
import authEs from '../locales/es/auth.json';
import welcomeEn from '../locales/en/welcome.json';
import welcomeEs from '../locales/es/welcome.json';
import dashboardEn from '../locales/en/dashboard.json';
import dashboardEs from '../locales/es/dashboard.json';

/**
 * Initialize i18next with best practices:
 * - Language detection from browser
 * - localStorage persistence
 * - Fallback language
 * - Namespace organization
 */
export const initI18n = () => {
    i18n
        // Detect user language
        .use(LanguageDetector)
        // Pass the i18n instance to react-i18next
        .use(initReactI18next)
        // Initialize i18next
        .init({
            // Resources organized by language and namespace
            resources: {
                en: {
                    common: commonEn,
                    landing: landingEn,
                    navigation: navigationEn,
                    auth: authEn,
                    welcome: welcomeEn,
                    dashboard: dashboardEn,
                },
                es: {
                    common: commonEs,
                    landing: landingEs,
                    navigation: navigationEs,
                    auth: authEs,
                    welcome: welcomeEs,
                    dashboard: dashboardEs,
                },
            },

            // Default language
            fallbackLng: DEFAULT_LANGUAGE,

            // Default namespace
            defaultNS: 'common',

            // Debug mode (disable in production)
            debug: import.meta.env.DEV,

            // Language detection options
            detection: {
                // Order of detection methods
                order: ['localStorage', 'navigator'],

                // Cache user language in localStorage
                caches: ['localStorage'],

                // localStorage key
                lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            },

            // Interpolation options
            interpolation: {
                // React already escapes values
                escapeValue: false,
            },

            // React options
            react: {
                // Use Suspense for async loading
                useSuspense: false,
            },
        });

    return i18n;
};

export default i18n;
