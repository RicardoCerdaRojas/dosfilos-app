import { useCallback, useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { LocalBibleService } from '@/services/LocalBibleService';

export interface CrossReferenceParallel {
    book: string;
    chapter: number;
    verse: number;
    /** Optional theological topic the source dataset tags the link with. */
    topic?: string;
    confidence?: number;
}

export interface CrossReferenceDoc {
    id: string;
    sourceBook: string;
    sourceChapter: number;
    sourceVerse: number;
    parallels: CrossReferenceParallel[];
    count: number;
    source: string;
}

interface UseCrossReferencesResult {
    parallels: CrossReferenceParallel[];
    loading: boolean;
    error: string | null;
    /** Forces a re-fetch — used by the step UI's "actualizar" button. */
    refresh: () => Promise<void>;
}

/**
 * Wraps the `lookupCrossReferences` callable (PR 0.5). Resolves a
 * passage string to its `book/chapter/verseStart-verseEnd` shape,
 * then aggregates parallels across the range. Failures degrade
 * silently — the RecognitionStep falls back to letting the pastor
 * type parallels manually.
 */
export function useCrossReferences(passage: string): UseCrossReferencesResult {
    const [parallels, setParallels] = useState<CrossReferenceParallel[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        const parsed = LocalBibleService.parseReference(passage);
        if (!parsed) {
            setError('No pudimos interpretar la referencia.');
            setParallels([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const callable = httpsCallable(getFunctions(), 'lookupCrossReferences');
            const payload =
                parsed.verseEnd && parsed.verseEnd !== parsed.verseStart
                    ? {
                          book: parsed.book,
                          chapter: parsed.chapter,
                          startVerse: parsed.verseStart,
                          endVerse: parsed.verseEnd,
                      }
                    : { book: parsed.book, chapter: parsed.chapter, verse: parsed.verseStart };
            const result = await callable(payload);
            const data = result.data as { docs?: CrossReferenceDoc[]; doc?: CrossReferenceDoc | null };
            const docs = data.docs ?? (data.doc ? [data.doc] : []);
            const aggregated = docs.flatMap((d) => d.parallels);
            // Dedupe by `book/chapter/verse` so range queries don't
            // surface the same parallel multiple times when several
            // source verses point to the same target.
            const seen = new Set<string>();
            const unique: CrossReferenceParallel[] = [];
            for (const p of aggregated) {
                const key = `${p.book}-${p.chapter}-${p.verse}`;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(p);
            }
            setParallels(unique);
        } catch (err: any) {
            console.error('[useCrossReferences]', err);
            setError(err?.message ?? 'No pudimos cargar paralelos.');
            setParallels([]);
        } finally {
            setLoading(false);
        }
    }, [passage]);

    useEffect(() => {
        if (passage) void fetch();
    }, [passage, fetch]);

    return { parallels, loading, error, refresh: fetch };
}
