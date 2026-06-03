import type { CitationManifest, CitationManifestEntry } from '../entities/SermonGenerator';
import type { AttributionReport, MissingAttribution } from '../entities/FidelityReport';
import {
    aggregateRequiredAttributions,
    SBLGNT_SOURCE_ID,
} from './aggregateRequiredAttributions';

/**
 * Pastoral Fidelity — Phase 3 PR 5 (ADR-006 / ADR-029 §Q7).
 *
 * Pure, LLM-free attribution check derived from the citation manifest. Two
 * outputs:
 *   - `requiredAttributions` — the blocks the export footer will render
 *     (delegated to `aggregateRequiredAttributions`, the single source of
 *     truth so the report and the rendered footer never drift).
 *   - `missingAttributions` — sources whose licence requires attribution but
 *     whose manifest entry carries no `requiredAttribution` lines, so the
 *     footer would silently omit a legally-required notice. This is an
 *     ingestion data gap, surfaced as a pre-publish flag.
 *
 * SBLGNT is exempt from the missing check: its attribution comes from the
 * hard-coded compliance blocks (`SBLGNT_TEXT_ATTRIBUTION` / `MORPHGNT_*`),
 * not from per-entry `requiredAttribution` lines.
 */
export function computeAttributionCheck(
    manifest: CitationManifest | undefined,
): AttributionReport {
    const requiredAttributions = aggregateRequiredAttributions(manifest);
    const missingAttributions = findMissingAttributions(manifest);
    return {
        requiredAttributions,
        missingAttributions,
        ok: missingAttributions.length === 0,
    };
}

/**
 * A manifest entry owes attribution when its licence is a Creative Commons
 * attribution licence (CC BY / CC BY-SA / …) or it carries an explicit
 * publisher copyright notice. Public-domain / unlicensed entries don't.
 */
function licenseRequiresAttribution(entry: CitationManifestEntry): boolean {
    const license = entry.license?.toLowerCase().trim() ?? '';
    if (license.includes('cc by')) return true;
    if (entry.copyright?.trim()) return true;
    return false;
}

function findMissingAttributions(
    manifest: CitationManifest | undefined,
): MissingAttribution[] {
    if (!manifest || !manifest.entries || manifest.entries.length === 0) return [];

    const covered = new Set(
        aggregateRequiredAttributions(manifest).map((block) => block.sourceId),
    );
    const missing: MissingAttribution[] = [];
    const seen = new Set<string>();

    for (const entry of manifest.entries) {
        // SBLGNT attribution comes from the compliance blocks, not the entry.
        if (entry.resourceId === SBLGNT_SOURCE_ID) continue;
        if (!licenseRequiresAttribution(entry)) continue;
        if (covered.has(entry.resourceId)) continue;
        if (seen.has(entry.resourceId)) continue;
        seen.add(entry.resourceId);
        missing.push({
            sourceId: entry.resourceId,
            title: entry.title,
            license: entry.license,
        });
    }

    return missing;
}
