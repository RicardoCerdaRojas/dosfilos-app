import type { SermonContent } from '../entities/SermonGenerator';
import type { CitationManifest } from '../entities/SermonGenerator';

/**
 * ADR-031 — deterministic anchor injection.
 *
 * Observed runtime behaviour: the LLM reliably (a) attributes sources
 * narratively in the prose ("Como señala Simon J. Kistemaker…") and (b) lists
 * them in `ragSources`, but it does NOT reliably emit the inline `[Sn]` anchor
 * the verifiable popover needs — even with an explicit prompt rule and the
 * File Search Store active.
 *
 * This pure pass closes that gap: for each manifest source, it finds where the
 * source is named in the prose (by author surname / title author-prefix) and
 * injects the `[Sn]` anchor at the end of that sentence. `validateCitations`
 * then maps `[Sn]` → `[n]`; the renderer turns `[n]` into the popover.
 *
 * It only anchors REAL manifest sources where the prose actually names them —
 * it never fabricates an attribution.
 */

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STOP = new Set([
    'de', 'la', 'el', 'los', 'las', 'del', 'y', 'en', 'a', 'su', 'comentario',
    'volvamos', 'como', 'usar', 'para', 'predicar', 'con', 'poder', 'the', 'of', 'and',
]);

/**
 * Candidate names to look for in prose for a manifest entry: the author's
 * SURNAME (last significant token — not first names/initials, which cause
 * false matches) plus any author-looking prefix in the title ("Subukjian - …").
 */
function candidateNames(author?: string, title?: string): string[] {
    const names = new Set<string>();
    const valid = (tok: string): string | null => {
        const t = tok.replace(/[^\p{L}]/gu, '').trim();
        return t.length >= 4 && !STOP.has(t.toLowerCase()) ? t : null;
    };
    // Author surname = the LAST valid token (skip "Simon", "J.", etc.).
    const authorToks = (author ?? '').split(/[\s,]+/).map(valid).filter(Boolean) as string[];
    if (authorToks.length) names.add(authorToks[authorToks.length - 1]);
    // Title "Surname[ & Surname] - Title" prefix tokens (multi-author / surname-in-title).
    const dash = (title ?? '').split(/[-–—]/)[0];
    if (dash && dash !== title) {
        (dash.split(/[\s,&]+/).map(valid).filter(Boolean) as string[]).forEach((t) => names.add(t));
    }
    return [...names];
}

/** Significant content words (≥5 chars, not stopwords) for lexical overlap. */
function significantWords(text: string): Set<string> {
    const out = new Set<string>();
    for (const raw of (text ?? '').toLowerCase().split(/[^\p{L}]+/u)) {
        if (raw.length >= 5 && !STOP.has(raw)) out.add(raw);
    }
    return out;
}

function overlapScore(pointWords: Set<string>, source: { excerpt?: string; title?: string }): number {
    const srcWords = significantWords(`${source.excerpt ?? ''} ${source.title ?? ''}`);
    let n = 0;
    for (const w of srcWords) if (pointWords.has(w)) n++;
    return n;
}

const MIN_POINT_OVERLAP = 2; // shared significant words to call a point "supported"

/**
 * Limpia el excerpt para citarlo: colapsa espacios, y marca continuidad con «…»
 * cuando es un fragmento (arranca en minúscula / no termina en puntuación) —
 * porque el excerpt es un recorte del chunk, no una frase completa.
 */
function cleanExcerpt(raw?: string): string {
    const t = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const startsMid = /^[\p{Ll}]/u.test(t);
    const endsClean = /[.!?…]$/.test(t);
    return `${startsMid ? '…' : ''}${t}${endsClean ? '' : '…'}`;
}

/** Blockquote con el excerpt REAL del RAG + atribución + marcador. `null` si sin excerpt. */
function buildExcerptBlockquote(e: CitationManifest['entries'][number]): string | null {
    const excerpt = cleanExcerpt(e.excerpt);
    if (!excerpt) return null;
    const displayTitle = (e.title ?? '').split(/\s[-–—]\s/).slice(-1)[0] || e.title || '';
    const author = e.author?.trim();
    const attribLine = author
        ? `— ${author}${displayTitle ? `, ${displayTitle}` : ''} [${e.sourceId}]`
        : `— «${displayTitle}» [${e.sourceId}]`;
    return `> «${excerpt}»\n>\n> ${attribLine}`;
}

/**
 * (b) Quita el lead-in de atribución que Gemini teje ("Como señala {autor}, ",
 * "Según {autor}, ", "Tal como lo expone {autor} en «título», ") del texto — así
 * el claim deja de estar atribuido a un autor SIN respaldo (era paráfrasis de
 * Gemini, no el texto real). El claim queda como punto del pastor; la cita real
 * va aparte como blockquote. Permite puntos de abreviatura ("J.") en el lead-in.
 * Si no hay un lead-in limpio, devuelve el texto igual (no toca la prosa).
 */
function stripAttributionLead(text: string, name: string): string {
    const re = new RegExp(
        `(^|[.!?]\\s+)((?:Como|Seg[úu]n|Tal como)\\b[^,]*?\\b${escapeRegex(name)}\\b[^,]*?,\\s*)`,
        'i',
    );
    const m = re.exec(text);
    if (!m) return text;
    const head = text.slice(0, m.index) + (m[1] ?? '');
    const after = text.slice(m.index + m[0].length).replace(/^([\p{Ll}])/u, (c) => c.toUpperCase());
    return `${head}${after}`;
}

export function injectNarrativeCitationAnchors(
    content: SermonContent,
    manifest: CitationManifest | undefined,
): SermonContent {
    if (!manifest || manifest.entries.length === 0) return content;

    const sources = manifest.entries.map((e) => ({
        entry: e,
        sourceId: e.sourceId,
        names: candidateNames(e.author, e.title),
    }));

    // (b) Cuando la prosa NOMBRA un autor real: quita la atribución de Gemini
    // (paráfrasis sin respaldo) y agrega el excerpt REAL como blockquote al final
    // del texto. Si no hay lead-in limpio para quitar, deja la frase y solo agrega
    // el blockquote (degradación segura).
    const anchorSurface = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let out = text;
        const blockquotes: string[] = [];
        for (const src of sources) {
            for (const name of src.names) {
                const nm = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').exec(out);
                if (!nm) continue;
                // ¿Ya anclado cerca de esta mención? (marcador propio de Gemini) → no dobles.
                if (/\[\s*S?\d/.test(out.slice(nm.index, nm.index + name.length + 40))) break;
                out = stripAttributionLead(out, name);
                const bq = buildExcerptBlockquote(src.entry);
                if (bq) blockquotes.push(bq);
                break; // one per source per surface
            }
        }
        return blockquotes.length ? `${out}\n\n${blockquotes.join('\n\n')}` : out;
    };

    // Per-point guarantee (ADR-031): every BODY point should carry ≥1 citation
    // — UNLESS no real source supports it. After named-source anchoring, any
    // point still without an anchor is matched to its best lexically-overlapping
    // source; if a source genuinely overlaps the point's content we anchor it
    // (defensible — the point draws on that source), otherwise we leave it
    // uncited (the goal's "salvo que no haya recursos" exception — never invent).
    const ensurePointCited = (pointContent: string, idx: number): string => {
        if (!pointContent || /\[\s*S?\d/.test(pointContent)) return pointContent;
        const words = significantWords(pointContent);
        let best: { entry: CitationManifest['entries'][number]; score: number } | null = null;
        for (const e of manifest.entries) {
            const score = overlapScore(words, e);
            if (score >= MIN_POINT_OVERLAP && (!best || score > best.score)) {
                best = { entry: e, score };
            }
        }
        if (!best) return pointContent; // no supporting source → leave uncited
        // Opción A (decisión del fundador 2026-07-06): la cita lleva el TEXTO REAL
        // del excerpt (del RAG) como blockquote, con sustancia y visible al
        // predicar — NO un name-drop hueco ("Como lo expone X [n]") con el texto
        // escondido en el popover. Es el texto del chunk (dato real), nada
        // fabricado; el `[Sn]` sigue abriendo el popover (fuente + página).
        const blockquote = buildExcerptBlockquote(best.entry);
        if (!blockquote) return pointContent; // sin texto real que citar → no inventamos
        const sep = /\n$/.test(pointContent) ? '' : '\n\n';
        return `${pointContent}${sep}${blockquote}`;
    };

    return {
        ...content,
        introduction: anchorSurface(content.introduction) ?? content.introduction,
        conclusion: anchorSurface(content.conclusion) ?? content.conclusion,
        callToAction: anchorSurface(content.callToAction),
        body: content.body.map((p, idx) => ({
            ...p,
            content: ensurePointCited(anchorSurface(p.content) ?? p.content, idx),
        })),
    };
}
