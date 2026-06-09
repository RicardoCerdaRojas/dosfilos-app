import { useQuery } from '@tanstack/react-query';
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
    /** Force a fresh ranking — used by the modal's "Volver a sugerir" CTA. */
    refresh: () => Promise<void>;
}

/**
 * Wraps the `identifyKeyWords` callable behind react-query so the LLM call is
 * made ONCE per passage and cached — re-mounts (e.g. the guided chat helper
 * re-rendering after each turn) and modal re-opens serve the cached candidates
 * instead of re-calling Gemini. The pastor can still force a fresh ranking via
 * `refresh()`.
 */
export function useIdentifyKeyWords(args: UseIdentifyKeyWordsArgs): UseIdentifyKeyWordsResult {
    const { passage, language, enabled, originalText } = args;

    const query = useQuery({
        queryKey: ['identifyKeyWords', passage, language, originalText ?? null],
        queryFn: async (): Promise<KeyWordCandidate[]> => {
            const callable = httpsCallable(getFunctions(), 'identifyKeyWords');
            const result = await callable({ passage, language, originalText });
            const data = result.data as { candidates?: KeyWordCandidate[] };
            return Array.isArray(data.candidates) ? data.candidates : [];
        },
        enabled: enabled && !!passage,
        // Candidates are stable per passage; keep them for the session so the
        // helper/modal never re-calls on a remount.
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60,
        retry: false,
    });

    return {
        candidates: query.data ?? [],
        loading: query.isLoading,
        error: query.error
            ? (query.error instanceof Error ? query.error.message : 'No pudimos identificar palabras clave.')
            : null,
        refresh: async () => {
            await query.refetch();
        },
    };
}
