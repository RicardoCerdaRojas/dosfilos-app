import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { readPersistedUtm } from '@/lib/analytics';

interface CaptureLeadInput {
    email: string;
    name?: string;
    leadMagnet?: string;
    /** Honeypot value — only forwarded so the server can drop bot fills. */
    website?: string;
}

interface CaptureLeadResult {
    ok: true;
    leadId: string;
    duplicate: boolean;
}

/**
 * React hook wrapping the `captureLead` Cloud Function. Automatically
 * forwards persisted UTM params + the analytics session id so the
 * server-side lead row carries the same attribution context as the
 * funnel events fired on the same page.
 *
 * Returns a `submit` function plus `loading` / `error` state — the
 * lead-magnet landing form binds to these directly. No React Query
 * because the call is one-shot per visitor session and we don't
 * want background retries (a duplicate submit re-sends the email).
 */
export function useCaptureLead() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CaptureLeadResult | null>(null);

    const submit = useCallback(async (input: CaptureLeadInput): Promise<CaptureLeadResult> => {
        setLoading(true);
        setError(null);
        try {
            const functions = getFunctions();
            const callable = httpsCallable<unknown, CaptureLeadResult>(functions, 'captureLead');
            const utm = readPersistedUtm();
            const sessionId = readSessionId();
            const response = await callable({
                ...input,
                utm,
                sessionId,
            });
            setResult(response.data);
            return response.data;
        } catch (err: any) {
            const message = err?.message ?? 'No pudimos enviar el manual. Intenta de nuevo.';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { submit, loading, error, result };
}

function readSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem('dosfilos_session_id');
    } catch {
        return null;
    }
}
