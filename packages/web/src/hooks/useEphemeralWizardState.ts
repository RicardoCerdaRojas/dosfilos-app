import { useCallback, useEffect, useState } from 'react';

/**
 * Local-only persistence for the wizard's "before-anything-exists" gap.
 *
 * The wizard's Firestore-backed autosave (`useAutoSave`) only kicks in
 * after the user generates an exegesis — that's when the sermon doc
 * is created and `sermonId` exists. Before that, the passage input +
 * chat messages with the assistant live purely in React state, so a
 * tab refresh during setup wipes everything.
 *
 * This hook backs that gap with `localStorage` keyed per-user. Reads
 * the snapshot on mount, writes on every change. The wizard clears
 * the snapshot once it creates the real sermon doc — from that point
 * Firestore persistence takes over and the ephemeral state is no
 * longer authoritative.
 *
 * Snapshot is per-user (not per-tab) so reopening the app on the same
 * device restores the in-progress passage. Cross-device persistence
 * intentionally does NOT happen until the sermon doc is created —
 * Step 1 is cheap to redo; we don't want abandoned drafts polluting
 * Firestore.
 */
export interface EphemeralWizardSnapshot {
    /** Passage the user typed in Step 1 / Step 0. */
    passage: string;
    /** When the snapshot was last written, for stale detection. */
    updatedAt: number;
}

interface UseEphemeralWizardStateOptions {
    /** Authenticated user id. When undefined the hook becomes a no-op. */
    userId: string | undefined;
    /** Snapshots older than this are discarded on load. Default 7 days. */
    ttlMs?: number;
}

const STORAGE_PREFIX = 'preach.wizard.ephemeral.';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useEphemeralWizardState({ userId, ttlMs = DEFAULT_TTL_MS }: UseEphemeralWizardStateOptions) {
    const [snapshot, setSnapshotState] = useState<EphemeralWizardSnapshot | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on userId change.
    useEffect(() => {
        if (!userId) {
            setSnapshotState(null);
            setHydrated(true);
            return;
        }
        try {
            const raw = readStorage()?.getItem(keyFor(userId));
            if (!raw) {
                setSnapshotState(null);
                setHydrated(true);
                return;
            }
            const parsed = JSON.parse(raw) as EphemeralWizardSnapshot;
            if (!parsed || typeof parsed.passage !== 'string') {
                setSnapshotState(null);
                setHydrated(true);
                return;
            }
            if (Date.now() - (parsed.updatedAt ?? 0) > ttlMs) {
                readStorage()?.removeItem(keyFor(userId));
                setSnapshotState(null);
                setHydrated(true);
                return;
            }
            setSnapshotState(parsed);
            setHydrated(true);
        } catch {
            setSnapshotState(null);
            setHydrated(true);
        }
    }, [userId, ttlMs]);

    const setPassage = useCallback(
        (passage: string) => {
            if (!userId) return;
            const next: EphemeralWizardSnapshot = {
                passage,
                updatedAt: Date.now(),
            };
            setSnapshotState(next);
            try {
                readStorage()?.setItem(keyFor(userId), JSON.stringify(next));
            } catch {
                // Quota or privacy mode — silent fail is acceptable; the
                // in-memory state still works for the current tab.
            }
        },
        [userId],
    );

    const clear = useCallback(() => {
        if (!userId) return;
        setSnapshotState(null);
        try {
            readStorage()?.removeItem(keyFor(userId));
        } catch {
            // ignore
        }
    }, [userId]);

    return { snapshot, hydrated, setPassage, clear };
}

function keyFor(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
}

function readStorage(): Storage | null {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch {
        // Some browsers throw when localStorage is disabled.
    }
    return null;
}
