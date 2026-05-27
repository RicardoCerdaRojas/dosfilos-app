import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { KeyWordCandidate, WordStudyLanguage } from '@dosfilos/domain';

interface UseIdentifyKeyWordsArgs {
    passage: string;
    language: WordStudyLanguage;
    /** Skip auto-fetch until the consumer is ready (modal closed, no passage, etc.). */
    enabled: boolean;
    /** Optional original-language text (SBLGNT/MorphHB pre-fetched). */
    originalText?: string;
}

interface UseIdentifyKeyWordsResult {
    candidates: KeyWordCandidate[];
    loading: boolean;
    error: string | null;
    /** Re-run the callable — used by the modal's "Volver a sugerir" CTA. */
    refresh: () => Promise<void>;
}

/**
 * Wraps the `identifyKeyWords` callable. Fires once on mount when
 * `enabled` flips true; subsequent passages re-trigger. The result is
 * deliberately not cached across modal open/close — the pastor may want
 * a fresh ranking after editing the passage.
 */
export function useIdentifyKeyWords(args: UseIdentifyKeyWordsArgs): UseIdentifyKeyWordsResult {
    const { passage, language, enabled, originalText } = args;
    const [candidates, setCandidates] = useState<KeyWordCandidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlightRef = useRef(false);

    const fetch = useCallback(async () => {
        if (!enabled || !passage) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const callable = httpsCallable(getFunctions(), 'identifyKeyWords');
            const result = await callable({ passage, language, originalText });
            const data = result.data as { candidates?: KeyWordCandidate[] };
            setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        } catch (err: unknown) {
            console.error('[useIdentifyKeyWords]', err);
            const message = err instanceof Error ? err.message : 'No pudimos identificar palabras clave.';
            setError(message);
            setCandidates([]);
        } finally {
            inFlightRef.current = false;
            setLoading(false);
        }
    }, [enabled, passage, language, originalText]);

    useEffect(() => {
        if (enabled && passage) {
            void fetch();
        }
    }, [enabled, passage, language, fetch]);

    return { candidates, loading, error, refresh: fetch };
}
