import type {
    CitationManifest,
    CitationManifestEntry,
    RAGSource,
    SermonContent,
} from '../entities/SermonGenerator';

/**
 * Per-validation diagnostics — returned to callers so the application
 * layer can log + report stats (how many junk markers the LLM emitted,
 * how many bogus ragSource entries got stripped, etc.).
 */
export interface CitationValidationStats {
    markersValid: number;
    markersDropped: number;
    droppedEntries: { reason: 'unknown-id' | 'no-id'; entry: RAGSource }[];
    surfaces: ('introduction' | 'body' | 'conclusion' | 'callToAction')[];
}

export interface ValidateCitationsResult {
    content: SermonContent;
    bibliography: RAGSource[];
    manifest: CitationManifest;
    stats: CitationValidationStats;
}

/**
 * Server-side post-generation pass that enforces the Phase B citation
 * contract:
 *
 *   1. Inline `[Sn]` / `[n]` markers in prose: any number not present
 *      in the manifest is stripped. Multi-cite (`[1, 3]`) is preserved
 *      but unknown numbers within the group drop out (`[1, 99]` → `[1]`).
 *      Empty groups (`[]`) get the brackets removed entirely.
 *
 *   2. `ragSources[]`: entries whose `sourceId` is missing or not in
 *      the manifest are dropped. The LLM is allowed to cite a subset
 *      of the available sources (it might not use them all), but it
 *      cannot invent IDs.
 *
 *   3. Re-numbering: after dropping, the surviving manifest entries are
 *      re-numbered 1..M and every marker in prose + every `sourceId`
 *      in ragSources is rewritten to match the new ordinals. Pastors
 *      see contiguous `[1]`, `[2]`, … in the rendered text and a
 *      bibliography numbered the same way.
 *
 * Pure function — no I/O. Safe in domain layer + easy to test.
 *
 * Bible references that already use the project's `[📖 Ref]` markdown
 * link format are NOT affected (the marker regex requires a digit
 * inside the brackets, no leading emoji or `#bible-` URL).
 */
export function validateCitations(
    content: SermonContent,
    manifest: CitationManifest,
): ValidateCitationsResult {
    const stats: CitationValidationStats = {
        markersValid: 0,
        markersDropped: 0,
        droppedEntries: [],
        surfaces: [],
    };

    // Map original sourceId → 1-based ordinal in the manifest (for the
    // first pass we keep originals; renumbering happens after we know
    // which ones actually got cited and survived).
    const originalIds = new Set(manifest.entries.map((e) => e.sourceId));
    // Allow both `[S1]` and `[1]` syntaxes in prose — the LLM can drift
    // to either; we normalize on output to plain `[1]`.
    const idToOrdinal = new Map<string, number>();
    manifest.entries.forEach((e, idx) => {
        idToOrdinal.set(e.sourceId, idx + 1);
        idToOrdinal.set(`${idx + 1}`, idx + 1); // also accept the bare ordinal
    });

    // Stage 1: pass over every prose surface, strip unknown markers,
    // track which ordinals were actually cited. Re-emit each surface
    // with the kept markers in a placeholder syntax `__CITE__{n}__` so
    // stage 3 can renumber without re-parsing.
    const citedOrdinals = new Set<number>();

    const processProse = (
        text: string | undefined,
        surface: CitationValidationStats['surfaces'][number],
    ): string => {
        if (!text) return text ?? '';
        let hadAnyMarker = false;
        const rewritten = text.replace(/\[([^\]]+)\]/g, (match, body: string) => {
            // Bible-reference link syntax `[📖 …](…)` is NEVER stripped —
            // it has a non-digit lead character and lives inside a
            // markdown link, not a standalone marker. The regex above
            // already matches the bracket contents; the guard here just
            // ensures we only touch numeric / Sn comma-separated groups.
            const trimmed = body.trim();
            if (!/^(?:S?\d+\s*)(?:,\s*S?\d+\s*)*$/i.test(trimmed)) {
                return match; // Not a citation marker — leave as-is.
            }
            hadAnyMarker = true;
            const tokens = trimmed.split(',').map((t) => t.trim());
            const keptOrdinals: number[] = [];
            for (const tok of tokens) {
                const normalized = tok.toUpperCase().startsWith('S')
                    ? tok.toUpperCase()
                    : tok;
                const ordinal = idToOrdinal.get(normalized);
                if (ordinal !== undefined) {
                    keptOrdinals.push(ordinal);
                    citedOrdinals.add(ordinal);
                    stats.markersValid++;
                } else {
                    stats.markersDropped++;
                }
            }
            if (keptOrdinals.length === 0) {
                return ''; // Strip empty `[]` cleanly.
            }
            return `[${keptOrdinals.map((o) => `__CITE__${o}__`).join(', ')}]`;
        });
        if (hadAnyMarker) stats.surfaces.push(surface);
        return rewritten;
    };

    const newIntroduction = processProse(content.introduction, 'introduction');
    const newConclusion = processProse(content.conclusion, 'conclusion');
    const newCallToAction = content.callToAction !== undefined
        ? processProse(content.callToAction, 'callToAction')
        : undefined;
    const newBody = content.body.map((point) => ({
        ...point,
        content: processProse(point.content, 'body'),
    }));

    // Stage 2: filter ragSources to entries with valid sourceId.
    const keptEntriesByOriginalId = new Map<string, RAGSource>();
    for (const entry of content.ragSources ?? []) {
        if (!entry.sourceId) {
            stats.droppedEntries.push({ reason: 'no-id', entry });
            continue;
        }
        if (!originalIds.has(entry.sourceId)) {
            stats.droppedEntries.push({ reason: 'unknown-id', entry });
            continue;
        }
        keptEntriesByOriginalId.set(entry.sourceId, entry);
    }

    // Stage 3: build the surviving manifest from the union of
    // (cited-in-prose) and (kept-in-ragSources) sets. Re-number 1..M.
    const survivingOriginalIds = new Set<string>();
    manifest.entries.forEach((entry, idx) => {
        const ordinal = idx + 1;
        const inProse = citedOrdinals.has(ordinal);
        const inRagSources = keptEntriesByOriginalId.has(entry.sourceId);
        if (inProse || inRagSources) {
            survivingOriginalIds.add(entry.sourceId);
        }
    });

    const renumberMap = new Map<number, number>(); // old ordinal → new ordinal
    const newManifestEntries: CitationManifestEntry[] = [];
    let newOrdinal = 0;
    manifest.entries.forEach((entry, idx) => {
        if (!survivingOriginalIds.has(entry.sourceId)) return;
        newOrdinal++;
        renumberMap.set(idx + 1, newOrdinal);
        // Reassign sourceId to match the new ordinal so persistence
        // stays consistent — pastors editing the markdown later
        // shouldn't see a mismatch between S-IDs in the manifest and
        // the visible ordinal next to them.
        newManifestEntries.push({ ...entry, sourceId: `S${newOrdinal}` });
    });

    // Stage 4: walk the placeholder-marked prose and rewrite to final
    // `[N]` markers using the new ordinals.
    const finalizeProse = (text: string): string =>
        text.replace(/__CITE__(\d+)__/g, (_, oldOrdinalStr: string) => {
            const oldOrdinal = Number(oldOrdinalStr);
            const newN = renumberMap.get(oldOrdinal);
            return newN !== undefined ? String(newN) : '';
        });

    const finalContent: SermonContent = {
        ...content,
        introduction: finalizeProse(newIntroduction),
        conclusion: finalizeProse(newConclusion),
        callToAction: newCallToAction !== undefined ? finalizeProse(newCallToAction) : undefined,
        body: newBody.map((p) => ({ ...p, content: finalizeProse(p.content) })),
        citationManifest: { version: '1', entries: newManifestEntries },
        ragSources: renumberRagSources(keptEntriesByOriginalId, manifest, renumberMap),
    };

    return {
        content: finalContent,
        bibliography: finalContent.ragSources ?? [],
        manifest: finalContent.citationManifest!,
        stats,
    };
}

function renumberRagSources(
    keptByOriginalId: Map<string, RAGSource>,
    manifest: CitationManifest,
    renumberMap: Map<number, number>,
): RAGSource[] {
    const result: RAGSource[] = [];
    manifest.entries.forEach((entry, idx) => {
        const oldOrdinal = idx + 1;
        const newN = renumberMap.get(oldOrdinal);
        if (newN === undefined) return;
        const kept = keptByOriginalId.get(entry.sourceId);
        if (!kept) {
            // The marker was used in prose but the LLM didn't include
            // this in its ragSources output. Synthesize an entry from
            // the manifest metadata so the bibliography is complete.
            result.push({
                title: entry.title,
                author: entry.author,
                page: entry.page,
                usedFor: 'Citado en el sermón',
                sourceId: `S${newN}`,
            });
            return;
        }
        result.push({ ...kept, sourceId: `S${newN}` });
    });
    return result;
}
