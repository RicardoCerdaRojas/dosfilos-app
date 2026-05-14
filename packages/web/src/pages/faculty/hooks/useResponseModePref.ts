import { useState, useEffect, useCallback } from 'react';
import type { ResponseMode } from '@dosfilos/domain';

const STORAGE_KEY = 'faculty:responseMode';
const VALID_MODES: ResponseMode[] = ['auto', 'concise', 'detailed', 'academic', 'pastoral', 'layperson'];

function readStoredMode(): ResponseMode {
    if (typeof window === 'undefined') return 'auto';
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && (VALID_MODES as string[]).includes(raw)) return raw as ResponseMode;
    } catch {
        // localStorage can throw in incognito / disabled-cookies modes — ignore.
    }
    return 'auto';
}

/**
 * Cross-surface response-mode preference. Persisted in localStorage
 * so the choice the user makes on the directory home (orchestrator
 * input) carries into the chat session, and vice-versa. Without this
 * persistence the home + chat surfaces had separate state and the
 * mode reset to 'auto' on every navigation.
 *
 * Returns `[mode, setMode]` matching the standard useState signature
 * so call sites stay drop-in for existing setLengthPreference uses.
 */
export function useResponseModePref(): [ResponseMode, (next: ResponseMode) => void] {
    const [mode, setModeState] = useState<ResponseMode>(() => readStoredMode());

    // Sync changes from other tabs / surfaces in the same browser.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY || !e.newValue) return;
            if ((VALID_MODES as string[]).includes(e.newValue)) {
                setModeState(e.newValue as ResponseMode);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setMode = useCallback((next: ResponseMode) => {
        setModeState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Storage write failures are non-fatal — in-memory state still updates.
        }
    }, []);

    return [mode, setMode];
}
