/**
 * i18n Module Exports
 * 
 * Central export point for internationalization functionality.
 * Following Dependency Inversion Principle - export abstractions
 */

// Configuration
export { initI18n } from './config/i18n';
export { default as i18n } from './config/i18n';

// Hooks
export { useTranslation } from './hooks/useTranslation';

// Components
export { LanguageSwitcher } from './components/LanguageSwitcher';

// Types
export type {
    SupportedLanguage,
    LanguageOption,
    TranslationNamespace
} from './types';

export {
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    LANGUAGE_STORAGE_KEY
} from './types';
