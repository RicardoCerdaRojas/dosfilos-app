import { useQuery } from '@tanstack/react-query';
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
 * Wraps the `lookupCrossReferences` callable behind react-query so the TSK
 * lookup is made ONCE per passage and cached — re-mounts (e.g. the guided chat
 * helper re-rendering after each turn) and step re-opens serve the cached
 * parallels instead of re-calling. Failures degrade silently — the pastor can
 * still type parallels manually.
 */
export function useCrossReferences(passage: string): UseCrossReferencesResult {
    const query = useQuery({
        queryKey: ['crossReferences', passage],
        queryFn: async (): Promise<CrossReferenceParallel[]> => {
            const parsed = LocalBibleService.parseReference(passage);
            if (!parsed) throw new Error('No pudimos interpretar la referencia.');
            const callable = httpsCallable(getFunctions(), 'lookupCrossReferences');
            // Query each verse in the range with the SINGLE-verse shape (a doc
            // get) instead of the range shape — the range query needs a
            // composite index that isn't provisioned (returned 500). Capped so
            // a whole-chapter passage doesn't fan out unbounded.
            const end =
                parsed.verseEnd && parsed.verseEnd !== parsed.verseStart ? parsed.verseEnd : parsed.verseStart;
            const verses: number[] = [];
            for (let v = parsed.verseStart; v <= end && verses.length < 15; v++) verses.push(v);
            const results = await Promise.all(
                verses.map((verse) => callable({ book: parsed.book, chapter: parsed.chapter, verse })),
            );
            const docs = results.flatMap((r) => {
                const d = r.data as { docs?: CrossReferenceDoc[]; doc?: CrossReferenceDoc | null };
                return d.docs ?? (d.doc ? [d.doc] : []);
            });
            const aggregated = docs.flatMap((d) => d.parallels);
            // Dedupe by book/chapter/verse so range queries don't surface the
            // same parallel multiple times.
            const seen = new Set<string>();
            const unique: CrossReferenceParallel[] = [];
            for (const p of aggregated) {
                const key = `${p.book}-${p.chapter}-${p.verse}`;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(p);
            }
            return unique;
        },
        enabled: !!passage,
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60,
        retry: false,
    });

    return {
        parallels: query.data ?? [],
        loading: query.isLoading,
        error: query.error ? (query.error instanceof Error ? query.error.message : 'No pudimos cargar paralelos.') : null,
        refresh: async () => {
            await query.refetch();
        },
    };
}
