import type { ParsedCitation } from '@dosfilos/domain';

/**
 * Inline-citation regex. Matches the format the orchestrator + style
 * formatter emit: `(Author, "Title", p. N)` with optional pages and
 * tolerant whitespace. Title MUST be quoted — paraphrased claims that
 * lack quotes are matched too via the surrounding-sentence fallback in
 * `extractEvidence`. The same shape is used in
 * `DeterministicStyleFormatter` so post-format markdown is also
 * matchable here.
 */
const CITATION_REGEX =
    /\(\s*([^,()]+?)\s*,\s*"([^"]+)"(?:\s*,\s*(?:pp?\.\s*)?([\d–\-—,\s]+))?\s*\)/g;

/**
 * Parses every inline citation in `markdown` plus its surrounding
 * "claim text" — the closest preceding `"..."` block, or the
 * containing sentence as fallback. Pure function.
 */
export function parseCitations(markdown: string): ParsedCitation[] {
    const citations: ParsedCitation[] = [];
    let match: RegExpExecArray | null;
    // Reset lastIndex defensively — regex is module-scoped with the `g`
    // flag, so recursive calls would otherwise pick up where the last
    // one left off.
    CITATION_REGEX.lastIndex = 0;
    while ((match = CITATION_REGEX.exec(markdown)) !== null) {
        const [raw, authorRaw, titleRaw, pagesRaw] = match;
        const offset = match.index;
        const evidence = extractEvidence(markdown, offset);
        citations.push({
            raw,
            author: (authorRaw ?? '').trim(),
            title: (titleRaw ?? '').trim(),
            pages: pagesRaw ? pagesRaw.trim() : null,
            offset,
            evidence: evidence.text,
            evidenceIsQuoted: evidence.fromQuote,
        });
    }
    return citations;
}

/**
 * Extracts the text the citation is asserting comes from the source.
 * Strategy:
 *   1. If a `"..."` quote ends within ~200 chars before the citation,
 *      use that quote (high-confidence verbatim claim).
 *   2. Otherwise, walk back to the nearest sentence boundary
 *      (`.`/`!`/`?`/`\n\n`) and use that sentence (paraphrase claim).
 *
 * The window cap (200 chars / 1 sentence) keeps the evidence focused —
 * a paragraph-sized claim against a paragraph-sized excerpt would
 * always land in fuzzy-low territory because the noise dominates.
 */
function extractEvidence(
    markdown: string,
    citationOffset: number,
): { text: string; fromQuote: boolean } {
    // Search the 250-char window preceding the citation for a closing
    // quote. Use the LAST one (closest to the cite) — earlier quotes
    // in the same paragraph belong to other claims.
    const lookBack = Math.max(0, citationOffset - 250);
    const window = markdown.slice(lookBack, citationOffset);
    const lastQuoteEnd = window.lastIndexOf('"');
    if (lastQuoteEnd > 0) {
        // Find the matching opening quote by walking backwards.
        const quoteOpenIdx = window.lastIndexOf('"', lastQuoteEnd - 1);
        if (quoteOpenIdx >= 0 && lastQuoteEnd - quoteOpenIdx >= 4) {
            const quoteText = window.slice(quoteOpenIdx + 1, lastQuoteEnd).trim();
            if (quoteText.length >= 8) {
                return { text: quoteText, fromQuote: true };
            }
        }
    }

    // Fallback: containing sentence. Walk back to the previous
    // sentence-ending punctuation or paragraph break.
    const sentenceStart = findSentenceStart(markdown, citationOffset);
    const sentence = markdown
        .slice(sentenceStart, citationOffset)
        .replace(/\s+/g, ' ')
        .trim();
    return { text: sentence, fromQuote: false };
}

function findSentenceStart(markdown: string, offset: number): number {
    // Stop at the closest of: `. `, `! `, `? `, `\n\n`, or start of file.
    for (let i = offset - 1; i >= 0; i--) {
        const c = markdown[i];
        const next = markdown[i + 1];
        if ((c === '.' || c === '!' || c === '?') && (next === ' ' || next === '\n')) {
            return i + 2;
        }
        if (c === '\n' && next === '\n') return i + 2;
    }
    return 0;
}
