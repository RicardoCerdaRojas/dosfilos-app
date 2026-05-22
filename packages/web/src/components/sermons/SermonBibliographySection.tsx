import { BookMarked } from 'lucide-react';
import type { CitationManifest, RAGSource } from '@dosfilos/domain';
import { citationAnchorId } from '@/lib/citationMarkers';

interface SermonBibliographySectionProps {
    bibliography: RAGSource[] | undefined;
    /**
     * Phase B: when present, the section is rendered from the manifest
     * so the numbering matches the inline `[N]` markers and each row is
     * anchored as `#cite-N` so popovers can scroll to it. RAGSource
     * entries are merged in by `sourceId` to pick up `usedFor` notes
     * the LLM provided. Absent manifest = legacy ragSources-only mode.
     */
    manifest?: CitationManifest;
    /** Optional className for the wrapping <section>. */
    className?: string;
}

/**
 * Renders the list of library sources the generator pulled context
 * from while writing the sermon. Phase B uses the manifest as the
 * authoritative source — numbering, ordering, and metadata all come
 * from there, with the LLM-authored `usedFor` blurbs merged in by
 * `sourceId`. Legacy sermons fall back to the previous ragSources-only
 * rendering.
 *
 * Returns `null` when there's nothing to show so callers can drop the
 * component in unconditionally — sermons generated without RAG context
 * simply don't render a section. The section is rendered at the bottom
 * of the sermon viewer so it reads as an academic "Fuentes" footer
 * rather than interrupting the homiletic prose.
 */
export function SermonBibliographySection({ bibliography, manifest, className }: SermonBibliographySectionProps) {
    const entries = buildEntries(manifest, bibliography);
    if (entries.length === 0) return null;

    return (
        <section
            className={[
                'mt-12 pt-6 border-t border-border/60',
                'space-y-3',
                className ?? '',
            ].filter(Boolean).join(' ')}
            aria-label="Fuentes consultadas"
        >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BookMarked className="h-4 w-4 text-primary" />
                Fuentes consultadas
            </h2>
            <p className="text-xs text-muted-foreground">
                El asistente usó estos recursos de tu biblioteca para construir el sermón.
            </p>
            <ol className="space-y-2 list-decimal pl-5 marker:text-muted-foreground">
                {entries.map((entry) => (
                    <li
                        key={entry.key}
                        id={entry.anchorId}
                        className="text-sm leading-relaxed scroll-mt-24 transition-shadow rounded"
                    >
                        <span className="font-medium text-foreground">{entry.title}</span>
                        {entry.author && (
                            <span className="text-foreground/80">{' '}— {entry.author}</span>
                        )}
                        {entry.page && (
                            <span className="text-muted-foreground">{' '}(p. {entry.page})</span>
                        )}
                        {entry.usedFor && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                                {entry.usedFor}
                            </p>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}

interface RenderedEntry {
    key: string;
    anchorId?: string;
    title: string;
    author?: string;
    page?: string;
    usedFor?: string;
}

function buildEntries(
    manifest: CitationManifest | undefined,
    bibliography: RAGSource[] | undefined,
): RenderedEntry[] {
    if (manifest && manifest.entries.length > 0) {
        const ragBySourceId = new Map<string, RAGSource>();
        for (const rag of bibliography ?? []) {
            if (rag.sourceId) ragBySourceId.set(rag.sourceId, rag);
        }
        return manifest.entries.map((entry, idx) => {
            const rag = ragBySourceId.get(entry.sourceId);
            const ordinal = idx + 1;
            return {
                key: `${entry.sourceId}-${idx}`,
                anchorId: citationAnchorId(ordinal),
                title: rag?.title || entry.title,
                author: rag?.author || entry.author,
                page: rag?.page || entry.page,
                usedFor: rag?.usedFor,
            };
        });
    }

    // Legacy / no-manifest path: render ragSources verbatim, same as
    // PR #241 behavior, with no anchors (nothing to link to).
    return (bibliography ?? [])
        .filter((s) => s?.title?.trim())
        .map((source, idx) => ({
            key: `${source.title}-${idx}`,
            title: source.title,
            author: source.author,
            page: source.page,
            usedFor: source.usedFor,
        }));
}
