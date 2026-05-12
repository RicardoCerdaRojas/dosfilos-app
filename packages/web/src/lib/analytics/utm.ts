/**
 * UTM parameter capture + persistence.
 *
 * When a visitor lands via a tracked link (`?utm_source=meta&utm_campaign=launch_es&...`)
 * we extract the five canonical UTM keys from the URL and persist
 * them in localStorage so EVERY subsequent event during that
 * browser's lifetime can be attributed back to the original source.
 *
 * Without this persistence, you can attribute a `landing_view` but
 * not the downstream `register_completed` — because by then the
 * URL has been rewritten by the SPA router and the original UTMs
 * are gone. localStorage survives across pages, tabs, and
 * back-button navigation.
 *
 * First-touch attribution model: we DO NOT overwrite the persisted
 * UTMs on subsequent visits with new ones. The first source that
 * brought the visitor in gets credit for the conversion. This is
 * the conservative default for Meta + paid campaigns where
 * organic re-visits would otherwise wipe the original campaign
 * attribution.
 *
 * Override by clearing localStorage (dev only) or by visiting with
 * `?utm_force=1` (manual reset).
 */

const STORAGE_KEY = 'dosfilos_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type UtmKey = typeof UTM_KEYS[number];
export type UtmPayload = Partial<Record<UtmKey, string>>;

/**
 * Extract UTM params from the current URL. Returns an empty object
 * when none are present.
 */
function extractFromUrl(): UtmPayload {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const out: UtmPayload = {};
    for (const key of UTM_KEYS) {
        const value = params.get(key);
        if (value && value.trim().length > 0) {
            out[key] = value.trim();
        }
    }
    return out;
}

/**
 * Read persisted UTMs from localStorage. Returns empty object when
 * none are stored or when storage is unavailable (Safari private,
 * SSR, etc).
 */
export function readPersistedUtm(): UtmPayload {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed as UtmPayload;
        }
        return {};
    } catch {
        return {};
    }
}

/**
 * Capture UTMs from the URL on first visit and persist them. Runs
 * on every page load; no-ops when localStorage already has values
 * (first-touch attribution) unless `?utm_force=1` is set.
 *
 * Returns the effective UTM payload (newly-captured OR already-persisted).
 */
export function captureUtm(): UtmPayload {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const forceReset = params.get('utm_force') === '1';

    const persisted = readPersistedUtm();
    const hasPersisted = Object.keys(persisted).length > 0;

    if (hasPersisted && !forceReset) {
        return persisted;
    }

    const fresh = extractFromUrl();
    if (Object.keys(fresh).length === 0) {
        return persisted;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
        // Storage unavailable — proceed without persistence; the
        // current page will still be attributed via in-memory cache.
    }
    return fresh;
}
