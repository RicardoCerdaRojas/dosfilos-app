import { useLanguageSync } from '../hooks/useLanguageSync';

/**
 * Side-effect-only component that subscribes to the user's `preferredLanguage`
 * and keeps i18next aligned with it. Mounted once near the app root, alongside
 * `SessionTracker`. Renders nothing.
 */
export function LanguageSyncBridge(): null {
    useLanguageSync();
    return null;
}
