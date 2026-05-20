/**
 * Sermon-format quote extractor. Pulls author-attributed quote blocks
 * out of sermon markdown so the citation verifier can check whether
 * each quote is verifiable against the sermon's source corpus
 * (originating paper or Faculty conversation).
 *
 * The sermon prompt generates citation blocks in this shape:
 *
 *   > "Quote text here, possibly multi-line."
 *   > — *Author Name, Source Title*
 *
 * Or sometimes:
 *
 *   "Quote text here" — *Author Name, Source*
 *
 * Different from the exegetical-paper citation format
 * `(Author, "Title", p. N)` which `citationVerifier/citationParser.ts`
 * already handles — that parser is regex-locked to the inline academic
 * style. Sermon manuscript style uses pull-quote attribution which
 * needs its own pattern.
 *
 * Post-PR #217 the LLM is forbidden from fabricating quotes when no
 * verified source exists (it returns `authorityQuote: null`), but the
 * verifier runs as a defense-in-depth layer to catch quotes that did
 * slip through the prompt rule.
 */

export interface ParsedSermonCitation {
    /** Exact substring matched (for UI highlighting + manual edit). */
    raw: string;
    /** Quote text inside the quotation marks. */
    quote: string;
    /** Author name as written by the LLM. */
    author: string;
    /** Optional source title/work — everything after the comma in the attribution line. */
    source: string | null;
    /** Character offset in the input markdown (for jump-to-edit). */
    offset: number;
}

/**
 * Block-style attribution: pull-quote followed by attribution line.
 *
 *   > "Quote text…"
 *   > — *Author, Source*
 *
 * The em-dash can be `—` (U+2014), `–` (U+2013) or a plain `--`. The
 * attribution italics wrapper (`*…*` / `_…_`) is optional — strip
 * markdown emphasis if present. Multi-line quotes are joined.
 */
const BLOCK_CITATION_REGEX =
    /^>\s*[""]([\s\S]+?)["""](?:\s*\n>\s*)?\s*\n?>\s*(?:[—–]|--)\s*[*_]?([^*_\n]+?)[*_]?\s*$/gm;

/**
 * Inline attribution embedded in a paragraph (single line):
 *
 *   "Quote text" — *Author, Source*
 *
 * Less common in sermon manuscripts but the legacy
 * `prompts-generator.ts` template can produce it.
 */
const INLINE_CITATION_REGEX =
    /[""]([^""\n]{15,})["""](?:\s*\n?\s*)?(?:[—–]|--)\s*[*_]?([^*_\n.!?]+?)[*_]?(?=[.!?\n]|$)/g;

export function parseSermonCitations(markdown: string): ParsedSermonCitation[] {
    if (!markdown) return [];

    const found: ParsedSermonCitation[] = [];
    const seenOffsets = new Set<number>();

    // Block style first (more specific shape, wins on overlap).
    const blockRe = new RegExp(BLOCK_CITATION_REGEX.source, 'gm');
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(markdown)) !== null) {
        const [raw, quoteRaw, attributionRaw] = m;
        if (!quoteRaw || !attributionRaw) continue;
        const quote = normalizeQuote(quoteRaw);
        const { author, source } = splitAttribution(attributionRaw);
        if (!quote || !author) continue;
        found.push({
            raw,
            quote,
            author,
            source,
            offset: m.index,
        });
        seenOffsets.add(m.index);
    }

    // Inline style — skip ranges already covered by a block match to
    // avoid double-counting the same quote.
    const inlineRe = new RegExp(INLINE_CITATION_REGEX.source, 'g');
    while ((m = inlineRe.exec(markdown)) !== null) {
        if ([...seenOffsets].some(off => Math.abs(off - m!.index) < 50)) continue;
        const [raw, quoteRaw, attributionRaw] = m;
        if (!quoteRaw || !attributionRaw) continue;
        const quote = normalizeQuote(quoteRaw);
        const { author, source } = splitAttribution(attributionRaw);
        if (!quote || !author) continue;
        // Filter out scripture quotes — they're not "authority quotes"
        // and don't need verification. Heuristic: author looks like a
        // Bible reference (e.g. "Juan 3:16", "Romanos 8:28").
        if (looksLikeScriptureReference(author)) continue;
        found.push({
            raw,
            quote,
            author,
            source,
            offset: m.index,
        });
    }

    // Sort by offset so the dialog renders citations in document order.
    found.sort((a, b) => a.offset - b.offset);
    return found;
}

/**
 * Collapses multi-line markdown blockquote text into a single line +
 * normalizes whitespace. Strips the leading `> ` marker that
 * blockquote continuation lines carry.
 */
function normalizeQuote(text: string): string {
    return text
        .replace(/\n\s*>\s*/g, ' ')  // blockquote continuation → space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses the attribution line into `author` + optional `source` (title
 * of work). The comma is the separator the prompt template uses:
 * `*John Owen, "On the Patience of God"*`.
 *
 * When no comma present, the whole string is treated as the author.
 */
function splitAttribution(text: string): { author: string; source: string | null } {
    const cleaned = text
        .replace(/^[*_]+|[*_]+$/g, '')  // strip leading/trailing emphasis
        .trim();
    const commaIdx = cleaned.indexOf(',');
    if (commaIdx === -1) {
        return { author: cleaned, source: null };
    }
    const author = cleaned.slice(0, commaIdx).trim();
    const source = cleaned.slice(commaIdx + 1).trim().replace(/^["""']|["""']$/g, '') || null;
    return { author, source };
}

const SCRIPTURE_REF_REGEX = /^(\d?\s*[A-ZÁÉÍÓÚÑa-záéíóúñ]+)\s+\d+(:\d+([\-–]\d+)?)?$/;

/**
 * Heuristic scripture-reference detector: matches strings like
 * "Juan 3:16", "1 Corintios 13:4-7", "Génesis 1", "2 Timoteo 3:16-17".
 * Used to skip biblical quotes from citation verification (they need
 * no human-authority verification).
 */
function looksLikeScriptureReference(text: string): boolean {
    return SCRIPTURE_REF_REGEX.test(text.trim());
}
