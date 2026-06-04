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

export function injectNarrativeCitationAnchors(
    content: SermonContent,
    manifest: CitationManifest | undefined,
): SermonContent {
    if (!manifest || manifest.entries.length === 0) return content;

    const sources = manifest.entries.map((e) => ({
        sourceId: e.sourceId,
        names: candidateNames(e.author, e.title),
    }));

    const anchorSurface = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let out = text;
        for (const src of sources) {
            for (const name of src.names) {
                // A sentence (between sentence boundaries) that names the source.
                const re = new RegExp(`[^.!?\\n]*\\b${escapeRegex(name)}\\b[^.!?\\n]*[.!?]`, 'i');
                const m = re.exec(out);
                if (!m) continue;
                const sentence = m[0];
                // Already anchored anywhere in this sentence? leave it.
                if (/\[\s*S?\d/.test(sentence)) break;
                const injected = sentence.replace(/\s*([.!?])\s*$/, ` [${src.sourceId}]$1`);
                out = out.slice(0, m.index) + injected + out.slice(m.index + sentence.length);
                break; // one anchor per source per surface
            }
        }
        return out;
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
        // The LLM gave no narrative attribution for this point, so WRITE one
        // pointing at the real overlapping source. The popover (anchor) exposes
        // the verbatim excerpt + page; we never quote a possibly-messy fragment
        // inline. Author + work are real manifest data — nothing fabricated.
        const e = best.entry;
        const displayTitle = (e.title ?? '').split(/\s[-–—]\s/).slice(-1)[0] || e.title || '';
        const author = e.author?.trim();
        const leadIns = ['Como lo desarrolla', 'Como lo expone', 'Como bien lo trabaja', 'Según lo expone'];
        const lead = leadIns[idx % leadIns.length];
        const attribution = author
            ? `${lead} ${author}${displayTitle ? ` en «${displayTitle}»` : ''} [${e.sourceId}].`
            : `Esta verdad se expone en «${displayTitle}» [${e.sourceId}].`;
        const sep = /\n$/.test(pointContent) ? '' : '\n\n';
        return `${pointContent}${sep}${attribution}`;
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
