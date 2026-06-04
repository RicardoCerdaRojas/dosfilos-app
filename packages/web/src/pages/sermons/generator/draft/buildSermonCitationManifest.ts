import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    buildCitationManifest,
    selectSermonCitationChunks,
    FileSearchStoreContext,
    type RetrievedCitationChunk,
    type CitationManifest,
} from '@dosfilos/domain';

/** Shape of a chunk as returned by the `retrieveChunks` callable. */
interface RetrievedChunkApi {
    id: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor?: string;
    text: string;
    metadata?: { page?: string | number };
    score?: number;
    publiclyCitable?: boolean;
}

async function retrieve(scope: Record<string, unknown>): Promise<RetrievedChunkApi[]> {
    try {
        const fn = httpsCallable<Record<string, unknown>, { chunks: RetrievedChunkApi[] }>(
            getFunctions(),
            'retrieveChunks',
            { timeout: 30_000 },
        );
        const res = await fn(scope);
        return res.data?.chunks ?? [];
    } catch (e) {
        // Retrieval is best-effort: a failing scope just contributes no
        // citations. The sermon still generates (with fewer or no anchors).
        console.warn('[sermon citations] retrieveChunks failed for scope', scope, e);
        return [];
    }
}

const toCitationChunk = (c: RetrievedChunkApi): RetrievedCitationChunk => ({
    id: c.id,
    resourceId: c.resourceId,
    resourceTitle: c.resourceTitle,
    resourceAuthor: c.resourceAuthor,
    text: c.text,
    metadata: { page: c.metadata?.page },
    score: c.score,
    publiclyCitable: c.publiclyCitable,
});

/**
 * ADR-031 — builds the sermon's citation manifest from the pastor's PERSONAL
 * library (priority) + the CORE homiletics library (fallback), via the
 * semantic `retrieveChunks` callable. Each manifest entry carries the chunk
 * text + book + page so the rendered anchor can open a verifiable popover.
 *
 * Returns `undefined` when neither scope yields a real chunk — the sermon then
 * carries no citations (ADR-031: never invent; absence of a real source is the
 * only acceptable reason for a point to lack a citation).
 */
export async function buildSermonCitationManifest(opts: {
    query: string;
    userId?: string;
    topK?: number;
}): Promise<CitationManifest | undefined> {
    if (!opts.query?.trim()) return undefined;
    const topK = opts.topK ?? 10;

    const [personal, core] = await Promise.all([
        opts.userId
            ? retrieve({ query: opts.query, userId: opts.userId, topK })
            : Promise.resolve<RetrievedChunkApi[]>([]),
        retrieve({ query: opts.query, stores: [FileSearchStoreContext.HOMILETICS], topK }),
    ]);

    // [ADR-031 diag] temporary — remove after root-causing empty citations.
    console.log('[sermon citations] retrieved', {
        query: opts.query?.slice(0, 60),
        userId: opts.userId?.slice(0, 8),
        personal: personal.length,
        core: core.length,
        personalTitles: personal.slice(0, 3).map((c) => c.resourceTitle),
        coreTitles: core.slice(0, 3).map((c) => c.resourceTitle),
    });

    const selected = selectSermonCitationChunks(
        personal.map(toCitationChunk),
        core.map(toCitationChunk),
        { maxChunks: 10 },
    );
    console.log('[sermon citations] selected', selected.length, '→ manifest', selected.length === 0 ? 'undefined (fallback to legacy)' : `${selected.length} entries`);
    if (selected.length === 0) return undefined;
    return buildCitationManifest(selected);
}
