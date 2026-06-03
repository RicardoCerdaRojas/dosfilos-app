import type { CitationManifest } from '../entities/SermonGenerator';

/**
 * Canonical resource id used by `SBLGNTBibleProvider` for every chunk
 * derived from the SBL Greek New Testament critical text. The orchestrator
 * stamps chunks with this id so the export pipeline can attach the
 * required attribution that the licence demands.
 */
export const SBLGNT_SOURCE_ID = 'sblgnt';

/**
 * Source id used to deduplicate the MorphGNT morphology attribution block.
 * It is a logical sub-source of SBLGNT (same upstream repo) but carries a
 * different licence, so it gets its own id + block.
 */
export const MORPHGNT_SOURCE_ID = 'morphgnt';

/**
 * Block 1 — the SBLGNT **base Greek text** (Holmes 2010).
 *
 * The text itself is released by the Society of Biblical Literature under
 * CC BY 4.0. `SBLGNTBibleProvider` consumes only the surface-form column of
 * the MorphGNT files (it discards the part-of-speech + parsing columns), so
 * a sermon that cites SBLGNT redistributes the base text alone. That is why
 * this block is **always** present when any SBLGNT chunk reaches the
 * manifest.
 *
 * Founder decision (phase-3 bitácora 2026-05-30, "D-SBLGNT-license"):
 * separate the base text (CC BY 4.0) from the morphological tagging
 * (CC BY-SA 4.0) so the ShareAlike obligation only attaches when the
 * morphology is actually reproduced downstream.
 */
export const SBLGNT_TEXT_ATTRIBUTION: AttributionBlock = {
    sourceId: SBLGNT_SOURCE_ID,
    title: 'The Greek New Testament: SBL Edition (base text)',
    lines: [
        'Greek base text: The Greek New Testament: SBL Edition,',
        'edited by Michael W. Holmes.',
        'Copyright © 2010 Society of Biblical Literature and Logos Bible Software.',
        'Source: https://sblgnt.com',
        'Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).',
        'Used with segmentation and tokenization for retrieval.',
    ],
};

/**
 * Block 2 — the MorphGNT **morphological tagging** of SBLGNT.
 *
 * MorphGNT's morphology (part-of-speech, parsing: tense, voice, mood, case,
 * etc.) is licensed CC BY-SA 4.0. Reproducing that data downstream triggers
 * the ShareAlike obligation, so this block is appended **only when the
 * artefact actually renders morphological tagging** (see
 * `hasMorphologyRendered`). Today no sermon-pipeline path emits morphology
 * into the manifest — the provider strips those columns — so this block is
 * latent until such a path lands; the export then stays correct without
 * further changes.
 */
export const MORPHGNT_ATTRIBUTION: AttributionBlock = {
    sourceId: MORPHGNT_SOURCE_ID,
    title: 'MorphGNT — morphological analysis of SBLGNT',
    lines: [
        'Morphological tagging: MorphGNT (https://github.com/morphgnt/sblgnt),',
        'derived from The Greek New Testament: SBL Edition.',
        'Morphological data © MorphGNT contributors.',
        'Licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).',
        'Morphological analysis reproduced in this document inherits the',
        'ShareAlike (CC BY-SA 4.0) obligation.',
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
 * True when the artefact redistributes MorphGNT morphological tagging, which
 * is the trigger for the CC BY-SA 4.0 ShareAlike block (Block 2). The signal
 * is the structural `morphologyRendered` flag on an SBLGNT manifest entry —
 * stamped by whatever path surfaces parsing data (tense, case, …) in the
 * output.
 *
 * No current sermon-pipeline path sets the flag (`SBLGNTBibleProvider` emits
 * surface text only), so this returns `false` in practice today and only
 * Block 1 (CC BY 4.0) renders. Keeping the check structural — rather than
 * sniffing the prose — avoids false positives from a pastor describing Greek
 * grammar in their own words (which carries no ShareAlike obligation).
 */
export function hasMorphologyRendered(manifest: CitationManifest | undefined): boolean {
    if (!manifest || !manifest.entries) return false;
    return manifest.entries.some(
        (e) => e.resourceId === SBLGNT_SOURCE_ID && e.morphologyRendered === true,
    );
}

/**
 * Computes the mandatory attribution footer for an exported artefact.
 *
 * Rules:
 *   1. Any manifest entry with `resourceId === SBLGNT_SOURCE_ID` triggers the
 *      SBLGNT **base text** block (CC BY 4.0, ADR-006). The MorphGNT
 *      **morphology** block (CC BY-SA 4.0) is appended right after it only
 *      when `hasMorphologyRendered(manifest)` is true (founder decision,
 *      phase-3 bitácora 2026-05-30).
 *   2. Any manifest entry that carries `requiredAttribution` lines from its
 *      source rights metadata emits its own block.
 *   3. Blocks are deduplicated by `sourceId` so a single source attributes
 *      once per artefact regardless of citation count.
 *
 * Order is stable: SBLGNT base text first (if present), then MorphGNT
 * morphology (if rendered), then other sources in the order they first
 * appear in the manifest.
 */
export function aggregateRequiredAttributions(
    manifest: CitationManifest | undefined,
): AttributionBlock[] {
    if (!manifest || !manifest.entries || manifest.entries.length === 0) return [];

    const blocks: AttributionBlock[] = [];
    const seen = new Set<string>();

    const hasSblgnt = manifest.entries.some((e) => e.resourceId === SBLGNT_SOURCE_ID);
    if (hasSblgnt) {
        blocks.push(SBLGNT_TEXT_ATTRIBUTION);
        seen.add(SBLGNT_SOURCE_ID);
        if (hasMorphologyRendered(manifest)) {
            blocks.push(MORPHGNT_ATTRIBUTION);
            seen.add(MORPHGNT_SOURCE_ID);
        }
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
