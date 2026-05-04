import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dosfilos:owned-recommendations';

/**
 * Lightweight persistence for "Ya la tengo" toggles on the v1.7
 * corpus recommendation cards. Stored in localStorage keyed by the
 * stable `recommendationId` (author + title hash) so it survives
 * page reloads and follows the user across papers.
 *
 * Why localStorage and not Firestore (yet):
 *   - The catalog is hand-curated, not user-generated, so we don't
 *     have a per-user collection schema yet.
 *   - The flag is purely UI state ("don't bug me with this again");
 *     losing it on a different device is fine — the recommendation
 *     resurfaces, the user toggles again, no data integrity issue.
 *   - Avoids a Firestore round-trip and a write quota for what's
 *     effectively a checkbox.
 *
 * Telemetry events for marking-owned ARE sent to the server (via
 * `useTrackActivity`) so we can analyze which recommendations are
 * actually owned by users — that lives in the cloud-side analytics.
 *
 * Cross-tab sync (storage event) intentionally NOT implemented for
 * v1.7 — multi-tab editing of the same paper is unusual and the
 * minor staleness (other tab's toggle not reflected until reload)
 * doesn't break anything.
 */
export function useOwnedRecommendations() {
    const [owned, setOwned] = useState<ReadonlySet<string>>(() => loadFromStorage());

    // Re-read on mount in case localStorage was changed before the
    // component subscribed (e.g. after a hot reload). Cheap.
    useEffect(() => {
        setOwned(loadFromStorage());
    }, []);

    const toggle = useCallback((recommendationId: string) => {
        setOwned(prev => {
            const next = new Set(prev);
            if (next.has(recommendationId)) {
                next.delete(recommendationId);
            } else {
                next.add(recommendationId);
            }
            saveToStorage(next);
            return next;
        });
    }, []);

    const isOwned = useCallback(
        (recommendationId: string) => owned.has(recommendationId),
        [owned],
    );

    return { isOwned, toggle };
}

function loadFromStorage(): ReadonlySet<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((s): s is string => typeof s === 'string'));
    } catch {
        return new Set();
    }
}

function saveToStorage(owned: ReadonlySet<string>): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(owned)));
    } catch {
        // QuotaExceeded or Safari private mode — silently swallow,
        // the user just won't have persistence. Toggle still works
        // in-memory for the current session.
    }
}
