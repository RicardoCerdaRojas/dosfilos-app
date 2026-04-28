/**
 * Languages the AI engine and content authoring layer can render.
 *
 * Spanish is the launch default and the only required value across the schema.
 * English is opt-in; missing translations fall back to Spanish so a partially
 * translated agent still renders.
 *
 * Adding a new language: extend the union here, update `LocalizedString`
 * (Spanish stays required, the new code becomes optional like `en`), and run
 * the agent localization migration with the new locale as target.
 */
export type SupportedLanguage = 'es' | 'en';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

/**
 * Authoring-side primitive for any user-facing string that must round-trip
 * through the AI prompt layer in the user's preferred language.
 *
 * Why an object instead of an i18n key: agent personalities and expert
 * descriptions are EDITED by superadmins via the admin UI — they're content,
 * not UI labels. Keeping them in Firestore as `{ es, en }` lets a non-engineer
 * tweak both variants in place without redeploying translation files.
 *
 * Spanish is required because every agent must launch in the platform's primary
 * language. English (and any future code) is optional — the resolver falls
 * back to Spanish when missing.
 */
export interface LocalizedString {
    es: string;
    en?: string;
}

/**
 * Picks the best variant for the requested language, falling back to the
 * platform default when the requested locale isn't authored yet.
 *
 * Accepts plain strings too so call sites can be migrated incrementally —
 * legacy Firestore docs still serving `systemInstruction: string` keep working
 * until they're rewritten to the localized shape.
 */
export function resolveLocalized(
    value: LocalizedString | string | undefined,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[language] ?? value.es ?? '';
}

/**
 * Coerces a legacy plain-string value (read from older Firestore documents)
 * into the canonical `LocalizedString` shape. Used by repositories during the
 * migration window so application-layer code can assume the localized shape.
 */
export function coerceLocalized(value: LocalizedString | string | undefined): LocalizedString {
    if (!value) return { es: '' };
    if (typeof value === 'string') return { es: value };
    return value;
}
