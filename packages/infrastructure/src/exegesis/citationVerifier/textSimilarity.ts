/**
 * Lightweight text-similarity utilities used by `FuzzyCitationVerifier`.
 *
 * No external dependency: Jaccard token-set similarity is robust enough
 * for the verifier's use case (matching a quoted phrase against a body
 * of source text) and keeps the bundle slim. We deliberately avoid
 * Levenshtein here because it scales poorly with paragraph-sized text
 * and over-penalizes the natural reordering / minor wording variation
 * that occurs in real citations vs source content.
 */

/** Normalize: lowercase, NFD-strip diacritics, collapse non-letters to spaces. */
export function normalizeText(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        // Treat anything that isn't a letter or digit as a separator;
        // preserves Greek (Ͱ-Ͽ) and basic Latin which the
        // verifier needs for biblical-language cites.
        .replace(/[^a-z0-9Ͱ-Ͽ]+/g, ' ')
        .trim();
}

/**
 * Stop-word list — extremely conservative, only the function words that
 * dominate token overlap without carrying semantic weight. ES + EN
 * mixed because papers in this app cross both. Greek not included —
 * exegetical work cites Greek words deliberately, even short ones.
 */
const STOP_WORDS = new Set([
    // English
    'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'and', 'or', 'but',
    'is', 'was', 'be', 'as', 'by', 'for', 'with', 'that', 'this', 'it',
    'its', 'his', 'her', 'their', 'they', 'we', 'i', 'he', 'she',
    // Spanish
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'al', 'a', 'en', 'con', 'por', 'para', 'que', 'es', 'son', 'se',
    'su', 'sus', 'lo', 'le', 'les', 'y', 'o', 'pero', 'como', 'mas',
]);

/** Tokenize normalized text into content tokens (length ≥ 2, drops stop words). */
export function tokenize(s: string): string[] {
    return normalizeText(s)
        .split(' ')
        .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * Jaccard similarity over token sets — `|A ∩ B| / |A ∪ B|`. Returns 0
 * for empty inputs (no claim → can't verify) and treats duplicate
 * tokens as one (set semantics). Symmetric and bounded in [0, 1].
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const t of setA) if (setB.has(t)) intersection++;
    const unionSize = setA.size + setB.size - intersection;
    return unionSize === 0 ? 0 : intersection / unionSize;
}

/**
 * Sliding-window best-Jaccard search: scans `haystack` for the window
 * (of `needle`'s token length) that maximizes Jaccard against `needle`.
 *
 * Why a window: source content can be long (excerpts with full
 * paragraphs, full-document corpora with many pages). Computing
 * Jaccard once over the entire haystack drowns the signal — short
 * claims get diluted to ~0 against megabytes of unrelated tokens.
 *
 * Step size: window slides by `max(1, floor(needle.length / 2))`. A
 * coarser stride keeps the verifier responsive on long sources while
 * still landing within a half-window of the best match — high enough
 * resolution for the verdict thresholds.
 */
export function bestSlidingJaccard(needle: string[], haystack: string[]): number {
    if (needle.length === 0 || haystack.length === 0) return 0;
    if (haystack.length <= needle.length) {
        return jaccardSimilarity(needle, haystack);
    }
    const stride = Math.max(1, Math.floor(needle.length / 2));
    let best = 0;
    for (let start = 0; start + needle.length <= haystack.length; start += stride) {
        const window = haystack.slice(start, start + needle.length);
        const score = jaccardSimilarity(needle, window);
        if (score > best) best = score;
        // Early exit on a near-perfect match — saves work on long
        // sources without changing the verdict.
        if (best >= 0.95) return best;
    }
    // Tail window (in case the stride skipped past the end with the
    // best match in the trailing slice).
    const tail = haystack.slice(haystack.length - needle.length);
    const tailScore = jaccardSimilarity(needle, tail);
    if (tailScore > best) best = tailScore;
    return best;
}
