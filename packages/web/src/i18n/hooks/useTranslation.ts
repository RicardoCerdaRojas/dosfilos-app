/**
 * Custom i18n Hook
 * 
 * Provides a clean interface for translation functionality.
 * Following Single Responsibility Principle - only handles translation logic
 */

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { TranslationNamespace } from '../types';

/**
 * Type-safe hook for translations
 * 
 * @param namespace - Translation namespace to use
 * @returns Translation function and i18n instance
 */
export const useTranslation = (namespace?: TranslationNamespace) => {
    const { t, i18n } = useI18nextTranslation(namespace);

    return {
        t,
        i18n,
        /**
         * Current language code
         */
        language: i18n.language,

        /**
         * Change language
         */
        changeLanguage: (lng: string) => i18n.changeLanguage(lng),

        /**
         * Check if language is ready
         */
        isReady: i18n.isInitialized,
    };
};
