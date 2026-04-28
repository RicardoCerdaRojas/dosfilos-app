import React from 'react';
import { BookOpen, Info, Lightbulb, AlertTriangle, GraduationCap, ScrollText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useTranslation } from 'react-i18next';
import type { SourceReference } from '@dosfilos/domain';

// ---------------------------------------------------------------------------
// Language tagging — auto-wrap Hebrew and Greek runs with proper font/dir/lang
// ---------------------------------------------------------------------------

// Hebrew: main block + presentation forms + combining marks (niqqud, cantillation, dagesh)
const HEBREW_RANGE = '\\u0590-\\u05FF\\uFB1D-\\uFB4F';
// Greek: monotonic block + polytonic extended block
const GREEK_RANGE = '\\u0370-\\u03FF\\u1F00-\\u1FFF';

// Strict runs: match ONLY contiguous Hebrew/Greek characters (including combining
// marks within those Unicode blocks). Excluding Latin punctuation from the span
// avoids the bidi algorithm reordering parentheses, quotes, and commas around
// the RTL run in confusing ways.
const HEBREW_WORD_RE = new RegExp(`[${HEBREW_RANGE}]+`, 'g');
const GREEK_WORD_RE = new RegExp(`[${GREEK_RANGE}]+`, 'g');

/**
 * Wraps Hebrew/Greek runs in the content with appropriate font/dir/lang HTML spans,
 * so they render with SBL-quality typography and correct bidi/language semantics.
 *
 * Must be called AFTER extractCitations (which only touches Latin text) so we don't
 * mangle the injected <sup> tags. The regex only matches pure script characters,
 * so Latin-only tags like <sup data-cite="3">[3]</sup> are unaffected.
 *
 * The span is narrowed to only the Hebrew/Greek letters — punctuation and spaces
 * adjacent to the word stay outside the RTL context so the bidi algorithm doesn't
 * reposition them unexpectedly.
 */
export function wrapLanguageRuns(content: string): string {
    let out = content;
    // Hebrew first (RTL), then Greek
    out = out.replace(HEBREW_WORD_RE, (m) => {
        return `<span dir="rtl" lang="he" class="font-hebrew text-[1.05em] leading-[1.6]">${m}</span>`;
    });
    out = out.replace(GREEK_WORD_RE, (m) => {
        return `<span lang="el" class="font-greek">${m}</span>`;
    });
    return out;
}

// ---------------------------------------------------------------------------
// Scripture references — detect Bible refs (Jn 3:16, Génesis 1:1, 1 Corintios 13:4-7)
// and wrap them in interactive pills with an inline Popover showing the RVR1960 text.
// ---------------------------------------------------------------------------

// Broad regex to find POSSIBLE scripture references. We over-match intentionally
// and then validate each candidate through LocalBibleService.parseReference(),
// which drops anything that isn't a real book.
//
// Matches (tolerant of optional period after abbreviation and optional space):
//   - "Jn 3:16" / "Jn. 3:16"
//   - "Juan 3:16"
//   - "1 Juan 2:3" / "1Juan 2:3"
//   - "Génesis 1:1"
//   - "Gén. 2:23"   ← abbrev with period
//   - "1 Corintios 13:4-7"
//   - "Sal. 23:1" / "Sal 23:1" / "Sal.23:1"
const SCRIPTURE_CANDIDATE_RE = /\b((?:[123]\s?)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,12})\.?\s*(\d+):(\d+)(?:-(\d+))?\b/g;

export function wrapScriptureRefs(content: string): string {
    return content.replace(SCRIPTURE_CANDIDATE_RE, (match, bookRaw, chapter, verseStart, verseEnd) => {
        // Build a clean reference from the regex groups (strips stray periods).
        // parseReference doesn't accept periods between book name and chapter.
        const book = (bookRaw as string).trim();
        const cleanRef = verseEnd
            ? `${book} ${chapter}:${verseStart}-${verseEnd}`
            : `${book} ${chapter}:${verseStart}`;
        const parsed = LocalBibleService.parseReference(cleanRef);
        if (!parsed) return match;
        // Encode the cleaned reference for the data attribute; preserve the
        // original visible text (with period, accents, etc.) so the prose reads naturally.
        const encoded = encodeURIComponent(cleanRef);
        return `<span data-scripture="${encoded}">${match}</span>`;
    });
}

interface ScriptureRefProps {
    children?: React.ReactNode;
    'data-scripture'?: string;
}

export function ScriptureRef({ children, ...rest }: ScriptureRefProps) {
    const encoded = rest['data-scripture'];
    if (!encoded) return <span {...rest}>{children}</span>;

    const reference = decodeURIComponent(encoded);
    const text = React.useMemo(() => LocalBibleService.getVerses(reference), [reference]);

    if (!text) return <span>{children}</span>;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-baseline gap-0.5 align-baseline",
                        "text-emerald-700 dark:text-emerald-400",
                        "decoration-emerald-400/50 underline decoration-dotted underline-offset-4",
                        "hover:decoration-solid hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                        "px-0.5 rounded transition-colors cursor-pointer"
                    )}
                    aria-label={`Ver texto bíblico: ${reference}`}
                >
                    <ScrollText className="h-3 w-3 text-emerald-500/70 mr-0.5 self-center" />
                    <span>{children}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-96 p-0 overflow-hidden"
                side="top"
                align="center"
            >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-zinc-900 border-b border-emerald-100 dark:border-emerald-900">
                    <ScrollText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {reference}
                    </div>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                        RVR 1960
                    </span>
                </div>
                <div className="px-4 py-3 max-h-[40vh] overflow-y-auto">
                    <p className="font-reading text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                        {text}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ---------------------------------------------------------------------------
// Callouts — detect "> **Nota:** ...", "> **Definición:** ...", etc. in markdown
// and style them as GitHub-style admonitions.
// ---------------------------------------------------------------------------

type CalloutKind = 'note' | 'definition' | 'example' | 'warning';

const CALLOUT_STYLES: Record<CalloutKind, { icon: React.ComponentType<any>; label: string; classes: string; iconClass: string }> = {
    note: {
        icon: Info,
        label: 'Nota',
        classes: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900',
        iconClass: 'text-blue-600 dark:text-blue-400',
    },
    definition: {
        icon: GraduationCap,
        label: 'Definición',
        classes: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900',
        iconClass: 'text-violet-600 dark:text-violet-400',
    },
    example: {
        icon: Lightbulb,
        label: 'Ejemplo',
        classes: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        icon: AlertTriangle,
        label: 'Atención',
        classes: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
        iconClass: 'text-amber-600 dark:text-amber-400',
    },
};

/**
 * Detects callout blockquotes like "> **Nota:** ..." and converts them into
 * styled div containers that ReactMarkdown will pass through via rehype-raw.
 *
 * Handled labels (case-insensitive, with accents tolerant):
 *   - Nota          → blue "note"
 *   - Definición    → violet "definition"
 *   - Ejemplo       → emerald "example"
 *   - Atención      → amber "warning"
 */
export function transformCallouts(content: string): string {
    // Match blockquote lines that start with a callout label.
    // Pattern:  > **<Label>:** <body...>
    const labelMap: Array<{ rx: RegExp; kind: CalloutKind }> = [
        { rx: /nota/i, kind: 'note' },
        { rx: /definici[oó]n/i, kind: 'definition' },
        { rx: /ejemplo/i, kind: 'example' },
        { rx: /atenci[oó]n|advertencia/i, kind: 'warning' },
    ];

    // Match contiguous blockquote blocks whose first line opens with a callout label.
    // A blockquote block = one or more consecutive lines starting with "> ".
    const calloutBlockRe = /(^|\n)((?:> [^\n]*\n?)+)/g;

    return content.replace(calloutBlockRe, (_match, lead, block) => {
        // Find the label from the first line of the block
        const firstLine = (block as string).split('\n')[0];
        const labelMatch = firstLine.match(/^>\s*\*\*([^:*]+):?\*\*\s*/);
        if (!labelMatch) return `${lead}${block}`;
        const label = labelMatch[1].trim();
        const found = labelMap.find(l => l.rx.test(label));
        if (!found) return `${lead}${block}`;

        // Strip "> " from each line and remove the label marker from the first
        const bodyLines = (block as string)
            .split('\n')
            .filter(line => line.startsWith('>') || line.trim() === '')
            .map(line => line.replace(/^>\s?/, ''));
        bodyLines[0] = bodyLines[0].replace(/^\s*\*\*[^:*]+:?\*\*\s*/, '');
        const body = bodyLines.join('\n').trim();

        // Return a div marked with a data attribute; Markdown component override
        // will style it. Using raw HTML so rehype-raw renders the wrapper, and
        // ReactMarkdown still processes the body inside.
        // We emit the class name directly and rely on the custom Callout renderer
        // via the `data-callout` attr.
        return `${lead}<div data-callout="${found.kind}" data-label="${label}">\n\n${body}\n\n</div>\n`;
    });
}

interface CalloutProps {
    children?: React.ReactNode;
    'data-callout'?: string;
    'data-label'?: string;
}

export function Callout({ children, ...rest }: CalloutProps) {
    const kind = (rest['data-callout'] as CalloutKind | undefined);
    if (!kind || !CALLOUT_STYLES[kind]) {
        return <div {...rest}>{children}</div>;
    }
    const style = CALLOUT_STYLES[kind];
    const label = rest['data-label'] || style.label;
    const Icon = style.icon;
    return (
        <div
            className={cn(
                "my-3 rounded-lg border px-4 py-3 not-prose",
                style.classes
            )}
        >
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-1.5", style.iconClass)}>
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                {children}
            </div>
        </div>
    );
}

export interface Citation {
    num: number;
    author: string;
    title: string;
    pages: number[];
    snippet?: string;
}

/**
 * Extracts inline citations `(Autor, "Título", p. N)` or `(Autor, "Título", pp. N, M)`
 * and returns a numbered list plus a rewritten content string where each citation
 * is replaced by `<sup data-cite="N">[N]</sup>` HTML that ReactMarkdown + rehype-raw
 * will render through our custom `sup` component.
 *
 * Options:
 *   - onlyCitableSources: when true, citations whose source is not in `sources` or
 *     whose matching source has `publiclyCitable !== true` are STRIPPED from the text
 *     (replaced with empty string) and excluded from the citation list. This is how
 *     the app gates private/unlicensed material for non-admin users.
 */
export function extractCitations(
    content: string,
    sources: SourceReference[] = [],
    options: { onlyCitableSources?: boolean } = {}
): { rendered: string; citations: Citation[] } {
    // Defense-in-depth: strip any protected-source attribution the model
    // leaked despite the system-prompt rule. Covers ES legacy ("Material
    // curado"), ES current ("Material especializado") and EN ("Curated
    // material"). The server-side `cleanCitations` strips these too, but
    // older persisted messages may still contain them.
    let preprocessed = content.replace(
        /\((?:Material\s+(?:especializado|curado)|Curated\s+material)[^)]*\)\.?/gi,
        '',
    );

    // Pre-process: split multi-citations sharing one set of parens into
    // independent (...) groups so the single-citation regex below can match
    // each individually. Examples:
    //   (Watson, "Greek Grammar", p. 4; Wallace, "Syntax", p. 88)
    //   ⇒ (Watson, "Greek Grammar", p. 4)(Wallace, "Syntax", p. 88)
    preprocessed = preprocessed.replace(/\(([^()]+;[^()]+)\)/g, (_, inner: string) => {
        const parts = inner.split(/;\s*/).map(p => p.trim()).filter(Boolean);
        // Only split when every chunk looks like a citation (has the `Author, "Title"` shape).
        const allLookLikeCitations = parts.every(p => /^[^,]+,\s*"[^"]+"/.test(p));
        if (!allLookLikeCitations) return `(${inner})`;
        return parts.map(p => `(${p})`).join('');
    });

    // Matches:  (Author, "Title")           or
    //           (Author, "Title", p. N)     or
    //           (Author, "Title", pp. 1, 2) or
    //           (Author, "Title", p. N, § Section)
    const regex = /\(([^,()"]+?),\s*"([^"]+)"(?:,\s*(?:pp?\.)\s*([\d,\s]+))?(?:,\s*§[^)]*)?\)/g;

    const citations: Citation[] = [];
    const keyToNum = new Map<string, number>();

    // When gating is on, build a set of citable (author|title) keys for O(1) lookup.
    const citableKeys = options.onlyCitableSources
        ? new Set(
              sources
                  .filter(s => s.publiclyCitable === true)
                  .map(s => `${(s.author ?? '').toLowerCase().trim()}|${s.title.toLowerCase().trim()}`)
          )
        : null;

    const rendered = preprocessed.replace(regex, (match, authorRaw, titleRaw, pagesRaw) => {
        const author = (authorRaw as string).trim();
        const title = (titleRaw as string).trim();
        const key = `${author.toLowerCase()}|${title.toLowerCase()}`;

        // Gate: if the citation's source is not publicly citable, strip it entirely.
        // We also drop a single leading space to avoid leaving "Texto  ." doubled.
        if (citableKeys && !citableKeys.has(key)) {
            return '';
        }

        const pagesFromMatch: number[] = pagesRaw
            ? (pagesRaw as string)
                  .split(',')
                  .map(s => parseInt(s.trim(), 10))
                  .filter(n => Number.isFinite(n))
            : [];

        let num = keyToNum.get(key);
        if (!num) {
            num = citations.length + 1;
            keyToNum.set(key, num);
            // Enrich with snippet from sources if available
            const src = sources.find(
                s =>
                    (s.author ?? '').toLowerCase().trim() === author.toLowerCase() &&
                    s.title.toLowerCase().trim() === title.toLowerCase()
            );
            citations.push({
                num,
                author,
                title,
                pages: [...pagesFromMatch],
                snippet: src?.snippet,
            });
        } else {
            const c = citations[num - 1];
            for (const p of pagesFromMatch) {
                if (!c.pages.includes(p)) c.pages.push(p);
            }
        }
        return `<sup data-cite="${num}">[${num}]</sup>`;
    });

    // Sort pages numerically within each citation
    for (const c of citations) c.pages.sort((a, b) => a - b);

    // Post-clean: when citations were stripped (onlyCitableSources), we may have
    // left behind orphan spaces before punctuation or doubled horizontal spaces.
    // Preserve newlines.
    let cleaned = rendered;
    if (citableKeys) {
        cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
        cleaned = cleaned.replace(/[ \t]+([.,;:?!)])/g, '$1');
        cleaned = cleaned.replace(/\(\s*\)/g, '');
    }

    return { rendered: cleaned, citations };
}

interface CitationSupProps {
    citations: Citation[];
    children?: React.ReactNode;
    'data-cite'?: string;
}

/**
 * Custom `sup` component for ReactMarkdown. If the sup has a `data-cite="N"` attribute
 * we render it as a clickable anchor with a Popover showing the citation metadata.
 * Otherwise we render a plain `<sup>` (regular markdown exponents etc.).
 */
export function CitationSup({ citations, children, ...rest }: CitationSupProps) {
    const { t } = useTranslation('faculty');
    const citeAttr = rest['data-cite'];
    if (!citeAttr) {
        return <sup {...rest}>{children}</sup>;
    }
    const num = parseInt(citeAttr, 10);
    const citation = citations.find(c => c.num === num);
    if (!citation) {
        return <sup {...rest}>{children}</sup>;
    }

    const pagesLabel = citation.pages.length === 0
        ? null
        : citation.pages.length === 1
            ? `p. ${citation.pages[0]}`
            : `pp. ${citation.pages.join(', ')}`;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <sup>
                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center justify-center",
                            "mx-0.5 px-1.5 min-w-[1.4rem] h-[1.15rem]",
                            "rounded-md text-[0.65rem] font-semibold tabular-nums",
                            "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                            "dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900",
                            "border border-indigo-200 dark:border-indigo-800",
                            "transition-colors cursor-pointer align-super",
                            "no-underline"
                        )}
                        aria-label={t('bibliography.viewSourceAria', { num, author: citation.author, title: citation.title })}
                    >
                        {num}
                    </button>
                </sup>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 text-sm p-0 overflow-hidden"
                side="top"
                align="center"
            >
                <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-zinc-900 border-b border-slate-100 dark:border-zinc-800">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                            {citation.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {citation.author}
                        </div>
                    </div>
                </div>
                <div className="p-3 space-y-2">
                    {pagesLabel && (
                        <div className="text-xs">
                            <span className="text-slate-500 dark:text-slate-400">{t('bibliography.pagesConsulted')}: </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{pagesLabel}</span>
                        </div>
                    )}
                    {citation.snippet && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 italic border-l-2 border-indigo-200 dark:border-indigo-900 pl-2">
                            {citation.snippet}
                        </div>
                    )}
                    <a
                        href={`#cite-${num}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(`cite-${num}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el?.classList.add('ring-2', 'ring-indigo-400');
                            setTimeout(() => el?.classList.remove('ring-2', 'ring-indigo-400'), 1500);
                        }}
                    >
                        Ver en bibliografía →
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Bibliography panel — renders the numbered list of citations at the bottom of a message.
 * Each entry has id="cite-N" so the inline sup links scroll to it.
 *
 * `protectedSourcesCount` is the number of additional sources the model
 * consulted whose attribution is legally protected (no licence yet from the
 * author). Those don't appear in the numbered list but we surface a discreet
 * footnote so the user knows the answer drew on curated material.
 */
export function Bibliography({
    citations,
    protectedSourcesCount = 0,
}: {
    citations: Citation[];
    protectedSourcesCount?: number;
}) {
    const { t } = useTranslation('faculty');
    if (citations.length === 0 && protectedSourcesCount === 0) return null;

    return (
        <div className="mt-4 border-t border-slate-100 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{t('bibliography.title')}</span>
            </div>
            {citations.length > 0 && (
                <ol className="space-y-1.5">
                    {citations.map(c => {
                        const pagesLabel = c.pages.length === 0
                            ? null
                            : c.pages.length === 1
                                ? `p. ${c.pages[0]}`
                                : `pp. ${c.pages.join(', ')}`;
                        return (
                            <li
                                key={c.num}
                                id={`cite-${c.num}`}
                                className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex gap-2 pl-1 pr-2 py-1 rounded-md transition-all scroll-mt-20"
                            >
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                                    [{c.num}]
                                </span>
                                <span className="min-w-0">
                                    <span className="text-slate-500 dark:text-slate-400">{c.author} — </span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{c.title}</span>
                                    {pagesLabel && (
                                        <span className="text-slate-500 dark:text-slate-400">, {pagesLabel}</span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
            {protectedSourcesCount > 0 && (
                <p className="text-[11px] italic text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    + {t('bibliography.protectedFootnote', { count: protectedSourcesCount })}
                </p>
            )}
        </div>
    );
}
