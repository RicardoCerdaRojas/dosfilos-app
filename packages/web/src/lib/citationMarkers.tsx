import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Library } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CitationManifest } from '@dosfilos/domain';

/**
 * Manifest used by `<CitationMarker>` to dereference inline `[N]`
 * markers in sermon prose. Provided by `<SermonPreview>` so the
 * span renderer can find the right entry without prop-drilling through
 * react-markdown's component map.
 */
export const CitationManifestContext = React.createContext<CitationManifest | undefined>(undefined);

/**
 * Anchor ID used by the bibliography section and the popover "Ver en
 * bibliografía →" link. Kept in one place so renumber-sensitive sermons
 * don't drift between marker and target.
 */
export function citationAnchorId(ordinal: number): string {
    return `cite-${ordinal}`;
}

// Matches standalone numeric citation markers like `[1]` or `[1, 3]`.
// Requires the FIRST character inside the brackets to be a digit so it
// does not collide with Bible reference links (`[📖 Juan 1:1]`), prose
// brackets (`[author note]`), or footnote-style markers that may carry
// non-numeric content. Validated by the server-side `validateCitations`
// pass — any `[S1]` style markers are normalized to bare ordinals before
// the prose reaches this renderer.
const CITATION_MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

/**
 * Rewrite citation markers in the markdown source into `<span>` tags
 * the markdown renderer can hand to `<CitationMarker>`. Idempotent:
 * re-running on already-wrapped content is a no-op because the second
 * regex pass sees the brackets surrounded by `>…<` and they no longer
 * match (the lookahead/lookbehind aren't strictly necessary — the span
 * insertion preserves the `[N]` text inside, so subsequent runs would
 * re-wrap; callers should not double-process).
 *
 * The wrapped form keeps the visible `[N]` text inside the span so the
 * sermon still reads correctly when JS is disabled or the manifest is
 * absent — graceful degradation back to plain footnote markers.
 */
export function wrapCitationMarkers(content: string): string {
    return content.replace(CITATION_MARKER_RE, (match, ids: string) => {
        const normalized = ids.replace(/\s+/g, '');
        return `<span data-cite-id="${normalized}">${match}</span>`;
    });
}

interface CitationMarkerProps {
    children?: React.ReactNode;
    'data-cite-id'?: string;
}

/**
 * Renderer for a single inline citation marker. Looks up each comma-
 * separated ID against the manifest in context; renders one popover
 * per ID inside a unified `[1, 3]`-style chip. When the manifest is
 * missing or the IDs don't resolve, falls back to plain `<span>` so
 * the sermon still reads naturally.
 */
export function CitationMarker({ children, ...rest }: CitationMarkerProps) {
    const manifest = React.useContext(CitationManifestContext);
    const raw = rest['data-cite-id'];
    if (!raw || !manifest) return <span {...rest}>{children}</span>;

    const ids = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    const entries = ids
        .map((n) => ({ ordinal: n, entry: manifest.entries[n - 1] }))
        .filter((p): p is { ordinal: number; entry: NonNullable<typeof p.entry> } => Boolean(p.entry));
    if (entries.length === 0) return <span {...rest}>{children}</span>;

    return (
        <span className="inline-flex items-center align-baseline gap-0">
            <span className="text-foreground/70">[</span>
            {entries.map(({ ordinal, entry }, idx) => (
                <React.Fragment key={ordinal}>
                    {idx > 0 && <span className="text-foreground/70">,&nbsp;</span>}
                    <CitationPopover ordinal={ordinal} entry={entry} />
                </React.Fragment>
            ))}
            <span className="text-foreground/70">]</span>
        </span>
    );
}

interface CitationPopoverProps {
    ordinal: number;
    entry: CitationManifest['entries'][number];
}

/**
 * EL ÍNDIGO SE QUEDA, y es una decisión. Los neutros de este popover pasaron a
 * tokens del tema —así respeta claro y oscuro sin variantes escritas a mano—,
 * pero el índigo NO es un neutro ni un estado: es el color con el que la cita se
 * distingue de la prosa del sermón, dentro y fuera del popover. Traducirlo a
 * `primary` lo confundiría con las acciones de la aplicación, que es justo lo
 * que no debe parecer: una cita no se pulsa para actuar, se consulta.
 */
function CitationPopover({ ordinal, entry }: CitationPopoverProps) {
    const { t } = useTranslation('common');
    const author = entry.author?.trim();
    const page = entry.page?.trim();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center justify-center',
                        'min-w-[1.1rem] px-1 mx-0',
                        'rounded text-[0.78em] font-semibold tabular-nums leading-none',
                        'text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900',
                        'dark:text-indigo-300 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-200',
                        'transition-colors cursor-pointer no-underline align-baseline',
                    )}
                    aria-label={`Ver fuente ${ordinal}: ${entry.title}${author ? ` — ${author}` : ''}`}
                >
                    {ordinal}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm p-0 overflow-hidden" side="top" align="center">
                <div className="flex items-start gap-2 p-3 bg-muted/40 border-b border-border">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <div className="font-semibold text-foreground leading-tight">
                            {entry.title}
                        </div>
                        {author && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {author}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-3 space-y-2">
                    {page && (
                        <div className="text-xs">
                            <span className="text-muted-foreground">Página: </span>
                            <span className="font-medium text-foreground">{page}</span>
                        </div>
                    )}
                    {entry.excerpt && (
                        <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                            {entry.excerpt}
                        </div>
                    )}
                    {/*
                     * ABRIR EL LIBRO, no sólo saber su nombre.
                     *
                     * La cita dice título y página; llegar al libro era cosa del
                     * pastor: abrir la biblioteca y buscarlo a mano entre
                     * decenas. Este enlace lo lleva directo.
                     *
                     * SÓLO SI ES SUYO. Una cita de la biblioteca compartida no
                     * aparece en la suya, y ofrecer un enlace que no lleva a
                     * ninguna parte es peor que no ofrecerlo. Los sermones
                     * anteriores a este dato tampoco lo llevan: sin saber de
                     * dónde salió, no se adivina.
                     */}
                    {entry.scope === 'personal' && entry.resourceId && (
                        <Link
                            to={`/dashboard/library?resource=${encodeURIComponent(entry.resourceId)}`}
                            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            <Library className="h-3 w-3 shrink-0" />
                            {t('citations.openInLibrary')}
                        </Link>
                    )}
                    {entry.scope === 'core' && (
                        <p className="text-[11px] text-muted-foreground">
                            {t('citations.fromSharedLibrary')}
                        </p>
                    )}
                    <a
                        href={`#${citationAnchorId(ordinal)}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(citationAnchorId(ordinal));
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el?.classList.add('ring-2', 'ring-indigo-400');
                            setTimeout(() => el?.classList.remove('ring-2', 'ring-indigo-400'), 1500);
                        }}
                    >
                        {t('citations.seeInBibliography')}
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}
