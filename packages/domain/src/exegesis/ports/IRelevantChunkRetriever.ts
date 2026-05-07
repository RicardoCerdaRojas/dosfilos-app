/**
 * Per-query relevant-chunk retriever — the verifier's bridge to the
 * RAG index. The token-set + LLM verifiers can match against the
 * source's curated excerpts and the resource's `textContent`, but
 * `textContent` is capped (Firestore 1 MB doc limit). For long books
 * (700-page commentaries, multi-volume dictionaries) the cited pages
 * almost always live OUTSIDE that window — they exist in the
 * `document_chunks` collection with embeddings.
 *
 * This port lets the LLM verifier query for the chunks most relevant
 * to a single citation's evidence text, scoped to one resource.
 * Implementations live in infrastructure (the adapter wraps the
 * existing `retrieveChunks` cloud function used by Faculty + Library
 * RAG so the same indexing pipeline serves verification too).
 */
export interface IRelevantChunkRetriever {
    retrieve(input: RetrieveRelevantChunksInput): Promise<RetrieveRelevantChunksOutput>;
}

export interface RetrieveRelevantChunksInput {
    /** Embedding query — typically the citation's evidence sentence. */
    query: string;
    /** Owner id; the callable scopes chunks to the user's library. */
    userId: string;
    /** Resource the chunks must come from. One per call (per-citation). */
    resourceId: string;
    /** Top-K chunks to return; the adapter MAY clamp upward. */
    topK: number;
}

export interface RetrieveRelevantChunksOutput {
    chunks: ReadonlyArray<RetrievedChunk>;
}

export interface RetrievedChunk {
    /** Plain text of the chunk. */
    text: string;
    /**
     * Page number when the indexer recorded one. Surfaced to the
     * verifier as `pageHint: "p. N"` so the page-mismatch overlay
     * keeps working.
     */
    page: number | null;
    /**
     * Section label (e.g. "Comm. on v.1") when available. Used as a
     * pageHint fallback when no numeric page is present.
     */
    section: string | null;
    /** Cosine similarity score, [0, 1]. Adapters may pass through unchanged. */
    score: number;
}
