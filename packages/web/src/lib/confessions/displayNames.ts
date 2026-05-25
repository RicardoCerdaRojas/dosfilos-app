/**
 * Spanish display names for the 14 CORE Library confession ids.
 *
 * The Firestore catalog stores `shortTitle`, `tradition` and `year` in
 * English (canonical scholarly form). For Spanish-locale users we render
 * localized strings via these lookups so `/settings/confession` and the
 * banner don't surface English to a Spanish UI.
 *
 * All helpers fall back to the catalog value when an id or string isn't
 * mapped — forward-compatible with new confessions added post-Fase 0
 * without blocking on translation.
 */

const ES_DISPLAY_NAMES: Record<string, string> = {
    'apostles-creed': 'Credo de los Apóstoles',
    'nicene-creed': 'Credo Niceno-Constantinopolitano',
    'athanasian-creed': 'Credo Atanasiano',
    'definition-of-chalcedon': 'Definición de Calcedonia',
    'westminster-confession': 'Confesión de Westminster',
    'westminster-shorter-catechism': 'Catecismo Menor de Westminster',
    'westminster-larger-catechism': 'Catecismo Mayor de Westminster',
    'belgic-confession': 'Confesión Belga',
    'heidelberg-catechism': 'Catecismo de Heidelberg',
    'canons-of-dort': 'Cánones de Dort',
    'augsburg-confession': 'Confesión de Augsburgo',
    'schaff-creeds-vol-1': 'Schaff, Credos Vol. I',
    'schaff-creeds-vol-2': 'Schaff, Credos Vol. II',
    'schaff-creeds-vol-3': 'Schaff, Credos Vol. III',
};

const ES_TRADITIONS: Record<string, string> = {
    'Ancient Christian': 'Cristianismo antiguo',
    'Ancient Western Christian': 'Cristianismo occidental antiguo',
    'Reformed / Continental': 'Reformada / Continental',
    'Reformed / Presbyterian': 'Reformada / Presbiteriana',
    'Reformed': 'Reformada',
    'Lutheran': 'Luterana',
    'Cross-denominational': 'Interdenominacional',
    'Early church / ecumenical creeds': 'Iglesia primitiva / credos ecuménicos',
    'Protestant': 'Protestante',
};

const ES_YEARS: Record<string, string> = {
    'Early church; received Western form developed over time':
        'Iglesia primitiva; forma occidental recibida con el tiempo',
    'Probably 5th–6th century': 'Probablemente s. V-VI',
};

export function confessionDisplayName(
    id: string,
    fallback: string,
    locale: string,
): string {
    if (locale.startsWith('es') && ES_DISPLAY_NAMES[id]) {
        return ES_DISPLAY_NAMES[id];
    }
    return fallback;
}

export function traditionDisplay(value: string, locale: string): string {
    if (locale.startsWith('es') && ES_TRADITIONS[value]) {
        return ES_TRADITIONS[value];
    }
    return value;
}

/**
 * Year is mixed: some catalog entries store numbers (1530), others
 * store free-form strings ("Probably 5th–6th century"). Numbers pass
 * through as-is; only known English strings get translated.
 */
export function yearDisplay(value: number | string, locale: string): string {
    if (typeof value === 'number') return String(value);
    if (locale.startsWith('es') && ES_YEARS[value]) {
        return ES_YEARS[value];
    }
    return value;
}
