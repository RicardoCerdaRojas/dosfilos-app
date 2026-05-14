import { useState, useCallback } from 'react';
import { readPersistedUtm } from '@/lib/analytics';
import { leadsService, type CaptureLeadInput, type CaptureLeadResult } from '@dosfilos/application';

type SubmitInput = Omit<CaptureLeadInput, 'utm' | 'sessionId'>;

/**
 * React hook wrapping `leadsService.captureLead`. Forwards persisted
 * UTM params + the analytics session id so the server-side lead row
 * carries the same attribution context as the funnel events fired on
 * the same page.
 *
 * Returns `submit` + `loading` / `error` state — the lead-magnet
 * landing form binds to these directly. No React Query because the
 * call is one-shot per visitor session and we don't want background
 * retries (a duplicate submit re-sends the email).
 */
export function useCaptureLead() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<CaptureLeadResult | null>(null);

    const submit = useCallback(async (input: SubmitInput): Promise<CaptureLeadResult> => {
        setLoading(true);
        setError(null);
        try {
            const utm = readPersistedUtm();
            const sessionId = readSessionId();
            const data = await leadsService.captureLead({ ...input, utm, sessionId });
            setResult(data);
            return data;
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
