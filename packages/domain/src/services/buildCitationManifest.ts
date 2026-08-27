import type { CitationManifest, CitationManifestEntry } from '../entities/SermonGenerator';

/**
 * Minimal chunk shape the manifest builder needs. Decoupled from
 * `DocumentChunkData` so retrieval payloads (where `page` may be a string,
 * e.g. "Q&A 1") feed it directly — the builder stringifies `page` anyway.
 */
export interface CitationSourceChunk {
    id: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor?: string;
    text: string;
    metadata?: { page?: string | number };
    /** Biblioteca de la que salió — la estampa `selectSermonCitationChunks`. */
    scope?: 'personal' | 'core';
}

export interface CitationRightsSnapshot {
    license?: string;
    licenseUrl?: string;
    copyright?: string;
    requiredAttribution?: string[];
}

export interface BuildCitationManifestOptions {
    /** Cap on the manifest size. Defaults to 10 — keeps the Firestore doc small. */
    maxEntries?: number;
    /**
     * Cap on each entry's excerpt length. Defaults to 600 chars — el excerpt se
     * MUESTRA como cita en la prosa del sermón (blockquote), no solo en el popover,
     * así que necesita cuerpo suficiente para una cita real (antes 280 alcanzaba
     * solo para el popover). Sube el peso del doc Firestore un poco; aceptable.
     */
    maxExcerptLength?: number;
    /**
     * Optional resolver that maps a chunk's `resourceId` to a rights
     * snapshot (license + attribution). The orchestrator passes this
     * after looking up the source library resources for the retrieved
     * chunks; the manifest stamps each entry so the export pipeline can
     * aggregate mandatory attributions without re-fetching resources.
     */
    resolveRights?: (resourceId: string) => CitationRightsSnapshot | undefined;
}

/**
 * Turn a ranked list of retrieved chunks into the citation manifest
 * the LLM cites against. Pure function — no I/O.
 *
 * The order of `chunks` is preserved (callers pass them already sorted
 * by retrieval score) and assigned monotonic IDs `S1`, `S2`, … so the
 * LLM and the renderer share the same numbering as the bibliography.
 *
 * Chunks beyond `maxEntries` are dropped. Each excerpt is truncated at
 * `maxExcerptLength` on a word boundary when possible — the popover
 * needs enough context to verify the citation but not so much that the
 * Firestore doc bloats.
 */
export function buildCitationManifest(
    chunks: Array<CitationSourceChunk>,
    options: BuildCitationManifestOptions = {},
): CitationManifest {
    const maxEntries = options.maxEntries ?? 10;
    const maxExcerptLength = options.maxExcerptLength ?? 600;

    const entries: CitationManifestEntry[] = chunks
        .slice(0, maxEntries)
        .map((chunk, idx) => {
            const rights = options.resolveRights?.(chunk.resourceId);
            return {
                sourceId: `S${idx + 1}`,
                resourceId: chunk.resourceId,
                // La clave se OMITE si no viene, en vez de viajar con
                // `undefined`: Firestore rechaza `undefined` como valor.
                ...(chunk.scope ? { scope: chunk.scope } : {}),
                chunkId: chunk.id,
                title: chunk.resourceTitle,
                author: chunk.resourceAuthor && chunk.resourceAuthor.trim().length > 0
                    ? chunk.resourceAuthor
                    : undefined,
                page: chunk.metadata?.page !== undefined ? String(chunk.metadata.page) : undefined,
                excerpt: truncateExcerpt(chunk.text ?? '', maxExcerptLength),
                license: rights?.license,
                licenseUrl: rights?.licenseUrl,
                copyright: rights?.copyright,
                requiredAttribution: rights?.requiredAttribution,
            };
        });

    return { version: '1', entries };
}

function truncateExcerpt(text: string, max: number): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= max) return normalized;
    const cut = normalized.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    const safeCut = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
    return `${safeCut}…`;
}
