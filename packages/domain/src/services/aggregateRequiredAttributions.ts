import type { CitationManifest } from '../entities/SermonGenerator';

/**
 * Canonical resource id used by `SBLGNTBibleProvider` for every chunk
 * derived from the SBL Greek New Testament critical text. The orchestrator
 * stamps chunks with this id so the export pipeline can attach the
 * CC BY 4.0 attribution that the license requires.
 */
export const SBLGNT_SOURCE_ID = 'sblgnt';

/**
 * Mandatory attribution block for the MorphGNT distribution of SBLGNT,
 * the Greek text actually consumed by `SBLGNTBibleProvider` (downloaded
 * from `cdn.jsdelivr.net/gh/morphgnt/sblgnt`). Defined here (not in the
 * per-source seed) because the Greek text reaches the citation manifest
 * through the bible provider, not through a regular library resource —
 * so it isn't covered by the rights-snapshot resolver the orchestrator
 * passes to `buildCitationManifest`.
 *
 * Licence is CC BY-SA 4.0 per the MorphGNT LICENSE file. Sermons that
 * include Greek analysis derived from this corpus inherit the
 * ShareAlike obligation; the founder owns the policy decision on how
 * to communicate that downstream (`docs/pastoral-fidelity/decisions/`
 * has an open question on this).
 *
 * The export pipeline merges these lines into the artefact's
 * attribution footer whenever the manifest contains at least one
 * SBLGNT-derived entry.
 */
export const SBLGNT_ATTRIBUTION: AttributionBlock = {
    sourceId: SBLGNT_SOURCE_ID,
    title: 'The Greek New Testament: SBL Edition (MorphGNT distribution)',
    lines: [
        'Greek text + morphology: The Greek New Testament: SBL Edition,',
        'edited by Michael W. Holmes, with morphological tagging from MorphGNT.',
        'Copyright © 2010 Society of Biblical Literature and Logos Bible Software.',
        'Morphological data © MorphGNT contributors.',
        'Source: https://github.com/morphgnt/sblgnt',
        'Licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).',
        'Used with segmentation and tokenization for retrieval.',
    ],
};

export interface AttributionBlock {
    /**
     * Identifies the source so the renderer can deduplicate when the
     * same source produces multiple manifest entries (e.g. several
     * Greek words from SBLGNT in one sermon — one attribution suffices).
     */
    sourceId: string;
    /** Human-readable title for the section heading inside the block. */
    title: string;
    lines: string[];
}

/**
 * Computes the mandatory attribution footer for an exported artefact.
 *
 * Rules:
 *   1. Any manifest entry with `resourceId === SBLGNT_SOURCE_ID` triggers
 *      the SBLGNT attribution block (CC BY 4.0 compliance, ADR-006).
 *   2. Any manifest entry that carries `requiredAttribution` lines from
 *      its source rights metadata emits its own block.
 *   3. Blocks are deduplicated by `sourceId` so a single source attributes
 *      once per artefact regardless of citation count.
 *
 * Order is stable: SBLGNT first (if present), then other sources in the
 * order they first appear in the manifest.
 */
export function aggregateRequiredAttributions(
    manifest: CitationManifest | undefined,
): AttributionBlock[] {
    if (!manifest || !manifest.entries || manifest.entries.length === 0) return [];

    const blocks: AttributionBlock[] = [];
    const seen = new Set<string>();

    const hasSblgnt = manifest.entries.some((e) => e.resourceId === SBLGNT_SOURCE_ID);
    if (hasSblgnt) {
        blocks.push(SBLGNT_ATTRIBUTION);
        seen.add(SBLGNT_SOURCE_ID);
    }

    for (const entry of manifest.entries) {
        if (!entry.requiredAttribution || entry.requiredAttribution.length === 0) continue;
        if (seen.has(entry.resourceId)) continue;
        blocks.push({
            sourceId: entry.resourceId,
            title: entry.title,
            lines: entry.requiredAttribution,
        });
        seen.add(entry.resourceId);
    }

    return blocks;
}
