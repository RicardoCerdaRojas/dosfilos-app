import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';

/**
 * Compact short-form for date-fns relative time used across the dashboard.
 * Word-boundary patterns prevent collapses like "menos de un minuto" → "unmin".
 */
export const shortRelativeTime = (date: Date, locale: Locale): string =>
    formatDistanceToNow(date, { addSuffix: true, locale })
        .replace('alrededor de ', '')
        .replace(/\bhoras\b/g, 'h')
        .replace(/\bhora\b/g, 'h')
        .replace(/\bminutos\b/g, 'min')
        .replace(/\bminuto\b/g, 'min')
        .replace(/\bdías\b/g, 'd')
        .replace(/\bdía\b/g, 'd')
        .replace(/\bhours\b/g, 'h')
        .replace(/\bhour\b/g, 'h')
        .replace(/\bminutes\b/g, 'min')
        .replace(/\bminute\b/g, 'min')
        .replace(/\bdays\b/g, 'd')
        .replace(/\bday\b/g, 'd')
        .replace('about ', '');
