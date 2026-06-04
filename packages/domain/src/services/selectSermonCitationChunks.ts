/**
 * ADR-031 — chooses which retrieved chunks become the sermon's citation
 * manifest, honouring the founder's priority rule:
 *
 *   1. The pastor's PERSONAL library comes first (priority).
 *   2. The shared CORE library is the FALLBACK / fill: it supplies citations
 *      when the personal library is empty, returns nothing relevant, or leaves
 *      free slots after the personal hits.
 *
 * Pure + deterministic. The web layer retrieves `personal` and `core` chunks
 * via the `retrieveChunks` callable (semantic vector search) and hands them
 * here; the result feeds `buildCitationManifest`.
 *
 * Never invents: only real retrieved chunks flow through. If both lists are
 * empty the manifest is empty and the sermon simply carries no citations
 * (ADR-031: absence of a real source is the only acceptable reason for a point
 * to lack a citation).
 */

/** Minimal shape shared with `buildCitationManifest`'s chunk input + ranking. */
export interface RetrievedCitationChunk {
    id: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor?: string;
    text: string;
    metadata?: { page?: string | number; section?: string };
    /** Cosine similarity [0,1] from the vector search. */
    score?: number;
    /** Legal flag — curated CORE sources set this; surfaced for downstream attribution. */
    publiclyCitable?: boolean;
}

export interface SelectSermonCitationChunksOptions {
    /** Hard cap on the manifest (matches buildCitationManifest maxEntries). */
    maxChunks?: number;
    /** Drop chunks below this similarity before selecting. Default 0 (keep all). */
    minScore?: number;
}

function rankAndFilter(chunks: RetrievedCitationChunk[], minScore: number): RetrievedCitationChunk[] {
    return chunks
        .filter((c) => (c.score ?? 1) >= minScore)
        .slice()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Personal first, then CORE fills remaining slots. Deduplicates by chunk id
 * (and by resourceId+page as a coarse guard against the same passage arriving
 * from both scopes). Personal always outranks CORE regardless of raw score, so
 * the pastor's own library is genuinely the priority — CORE only fills the gap.
 */
export function selectSermonCitationChunks(
    personal: RetrievedCitationChunk[],
    core: RetrievedCitationChunk[],
    options: SelectSermonCitationChunksOptions = {},
): RetrievedCitationChunk[] {
    const maxChunks = options.maxChunks ?? 10;
    const minScore = options.minScore ?? 0;

    const rankedPersonal = rankAndFilter(personal, minScore);
    const rankedCore = rankAndFilter(core, minScore);

    const seen = new Set<string>();
    const out: RetrievedCitationChunk[] = [];

    const pushUnique = (chunk: RetrievedCitationChunk) => {
        if (out.length >= maxChunks) return;
        const idKey = chunk.id;
        const passageKey = `${chunk.resourceId}::${chunk.metadata?.page ?? ''}`;
        if (seen.has(idKey) || seen.has(passageKey)) return;
        seen.add(idKey);
        seen.add(passageKey);
        out.push(chunk);
    };

    // Priority order: every personal hit before any CORE hit.
    for (const c of rankedPersonal) pushUnique(c);
    for (const c of rankedCore) pushUnique(c);

    return out;
}
