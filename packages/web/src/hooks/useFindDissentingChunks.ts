import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { DissentingChunk } from '@dosfilos/domain';

/**
 * Phase 4 PR 1 (ADR-033) — thin wrapper over the `findDissentingChunks`
 * callable. Given the pastor's central idea, returns library chunks that
 * dissent from it (personal→CORE priority, server-classified). An empty
 * array means the library surfaced no opposing position — the caller treats
 * that as `no-dissent` (publish proceeds).
 *
 * Best-effort: a callable failure resolves to `[]` (logged) so a transient
 * RAG/LLM error never blocks publishing. P3 confrontation is a strong nudge,
 * not a brittle hard dependency.
 */
export function useFindDissentingChunks() {
    const [loading, setLoading] = useState(false);

    const scan = useCallback(async (centralIdea: string): Promise<DissentingChunk[]> => {
        if (!centralIdea.trim()) return [];
        setLoading(true);
        try {
            const fn = httpsCallable<{ centralIdea: string }, { dissenting: DissentingChunk[] }>(
                getFunctions(),
                'findDissentingChunks',
                { timeout: 60_000 },
            );
            const res = await fn({ centralIdea });
            return res.data?.dissenting ?? [];
        } catch (e) {
            console.warn('[contra-scan] findDissentingChunks failed', e);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    return { scan, loading };
}
