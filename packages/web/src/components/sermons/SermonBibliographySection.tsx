import { BookMarked } from 'lucide-react';
import type { RAGSource } from '@dosfilos/domain';

interface SermonBibliographySectionProps {
    bibliography: RAGSource[] | undefined;
    /** Optional className for the wrapping <section>. */
    className?: string;
}

/**
 * Renders the list of library sources the generator pulled context
 * from while writing the sermon (Fase 1 of audit follow-up). Each
 * entry shows title + author + page (when present) + a brief
 * `usedFor` note explaining how the source informed the sermon.
 *
 * Returns `null` when there's nothing to show so callers can drop the
 * component in unconditionally — sermons generated without RAG context
 * (standalone wizard with empty library, pre-fix legacy content)
 * simply don't render a section. The section is intentionally rendered
 * at the bottom of the sermon viewer so it reads as an academic
 * "Fuentes" footer rather than interrupting the homiletic prose.
 *
 * Fase 2 will add inline footnote markers (`[^1]`) tied to specific
 * sermon sections; this component will then handle the back-references
 * too.
 */
export function SermonBibliographySection({ bibliography, className }: SermonBibliographySectionProps) {
    const entries = (bibliography ?? []).filter((s) => s?.title?.trim());
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
                {entries.map((source, idx) => (
                    <li key={`${source.title}-${idx}`} className="text-sm leading-relaxed">
                        <span className="font-medium text-foreground">{source.title}</span>
                        {source.author && (
                            <span className="text-foreground/80">{' '}— {source.author}</span>
                        )}
                        {source.page && (
                            <span className="text-muted-foreground">{' '}(p. {source.page})</span>
                        )}
                        {source.usedFor && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                                {source.usedFor}
                            </p>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}
