import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PastoralWordAnalysis, WordStudyLanguage } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';

interface AnalyzeArgs {
    word: string;
    lemma: string;
    transliteration: string;
    verseRef: string;
    passage: string;
    language: WordStudyLanguage;
}

interface UseAnalyzeWordPastorallyResult {
    analysis: PastoralWordAnalysis | null;
    cacheHit: boolean | null;
    cacheId: string | null;
    loading: boolean;
    error: string | null;
    analyze: (args: AnalyzeArgs) => Promise<void>;
    reset: () => void;
}

/**
 * Pastoral Fidelity Phase 1.5 — wraps the `analyzeWordPastorally`
 * callable. Computes the deterministic `passageHash` client-side so the
 * server can use it as the Firestore cache key. The callable handles
 * cache probe + Gemini call + cache persist.
 */
export function useAnalyzeWordPastorally(): UseAnalyzeWordPastorallyResult {
    const [analysis, setAnalysis] = useState<PastoralWordAnalysis | null>(null);
    const [cacheHit, setCacheHit] = useState<boolean | null>(null);
    const [cacheId, setCacheId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyze = useCallback(async (args: AnalyzeArgs) => {
        setLoading(true);
        setError(null);
        try {
            const parsedVerse = parseVerseRef(args.verseRef);
            const callable = httpsCallable(getFunctions(), 'analyzeWordPastorally');
            const result = await callable({
                word: args.word,
                lemma: args.lemma,
                transliteration: args.transliteration,
                verseRef: args.verseRef,
                passage: args.passage,
                passageHash: hashString(`${args.passage}`),
                language: args.language,
                verseBook: parsedVerse?.book ?? '',
                verseChapter: parsedVerse?.chapter,
                verseNumber: parsedVerse?.verse,
            });
            const data = result.data as { analysis?: PastoralWordAnalysis; cacheHit?: boolean; cacheId?: string };
            if (!data.analysis) throw new Error('Respuesta sin análisis.');
            setAnalysis(data.analysis);
            setCacheHit(data.cacheHit ?? false);
            setCacheId(data.cacheId ?? null);
        } catch (err: unknown) {
            console.error('[useAnalyzeWordPastorally]', err);
            const message = err instanceof Error ? err.message : 'No pudimos generar el análisis.';
            setError(message);
            setAnalysis(null);
            setCacheHit(null);
            setCacheId(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setAnalysis(null);
        setError(null);
        setCacheHit(null);
        setCacheId(null);
    }, []);

    return { analysis, cacheHit, cacheId, loading, error, analyze, reset };
}

/**
 * Deterministic short hash for cache keys. NOT cryptographic — just a
 * 32-bit fold of the input. Same string → same hash across client and
 * server (server uses the equivalent of this fold).
 */
function hashString(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
    }
    // Convert to unsigned 32-bit hex.
    return (h >>> 0).toString(16).padStart(8, '0');
}

function parseVerseRef(ref: string): { book: string; chapter: number; verse: number } | null {
    const parsed = LocalBibleService.parseReference(ref);
    if (!parsed) return null;
    return {
        book: parsed.book,
        chapter: parsed.chapter,
        verse: parsed.verseStart,
    };
}
