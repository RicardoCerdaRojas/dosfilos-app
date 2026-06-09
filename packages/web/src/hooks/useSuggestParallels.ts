import { useQuery } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface ParallelSuggestion {
    reference: string;
    topic: string;
    rationale: string;
}

interface UseSuggestParallelsResult {
    parallels: ParallelSuggestion[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Wraps the `suggestCanonicalParallels` callable (LLM) behind react-query so it
 * runs ONCE per passage and is cached. Covers any passage — unlike the
 * Phase-0 TSK sample. The pastor still writes the relevance note himself.
 */
export function useSuggestParallels(passage: string, enabled: boolean): UseSuggestParallelsResult {
    const query = useQuery({
        queryKey: ['suggestCanonicalParallels', passage],
        queryFn: async (): Promise<ParallelSuggestion[]> => {
            const callable = httpsCallable(getFunctions(), 'suggestCanonicalParallels');
            const result = await callable({ passage });
            const data = result.data as { parallels?: ParallelSuggestion[] };
            return Array.isArray(data.parallels) ? data.parallels : [];
        },
        enabled: enabled && !!passage,
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60,
        retry: false,
    });

    return {
        parallels: query.data ?? [],
        loading: query.isLoading,
        error: query.error ? (query.error instanceof Error ? query.error.message : 'No pudimos sugerir paralelos.') : null,
        refresh: async () => {
            await query.refetch();
        },
    };
}
