import {
    BIBLE_CANON,
    findBooksByAlias,
    normalizeAlias,
    type BibleBookId,
} from '../bible/canon/BibleCanon';
import type { LibraryResourceScope } from '../entities/LibraryResource';

/**
 * Best-effort extraction of Bible books + scope from a resource title.
 *
 * Used at upload time to autocomplete the v1.7 smart-match metadata so
 * the user only has to confirm rather than fill in from scratch. Returns
 * empty / null when the title doesn't match anything confidently — the
 * upload form falls back to letting the user pick manually.
 *
 * False positives are worse than false negatives here: a wrong autofill
 * gets persisted and later breaks the smart-match dialog (the resource
 * is silently filtered out from the wrong paper). When in doubt, return
 * `null` for scope and `[]` for books and let the user decide.
 *
 * Examples:
 *   "Hebrews 1-8" (WBC 47A)            → { books: ['HEB'], inferredScope: 'book' }
 *   "2 Peter and Jude" (Bauckham WBC)  → { books: ['2PE', 'JUD'], inferredScope: 'book' }
 *   "The Letters of John" (Yarbrough)  → { books: ['1JN', '2JN', '3JN'], inferredScope: 'book' }
 *   "Romans" (Moo NICNT)               → { books: ['ROM'], inferredScope: 'book' }
 *   "BDAG"                             → { books: [], inferredScope: 'whole-testament' }
 *   "BDB Hebrew Lexicon"               → { books: [], inferredScope: 'whole-testament' }
 *   "Wallace Greek Grammar"            → { books: [], inferredScope: 'whole-testament' }
 *   "Calvino Sermones"                 → { books: [], inferredScope: null }
 */
export function inferBibleBooksFromTitle(title: string): {
    books: ReadonlyArray<BibleBookId>;
    inferredScope: LibraryResourceScope | null;
} {
    const normalized = normalizeAlias(title);
    if (!normalized) return { books: [], inferredScope: null };

    // 1. Reference-work shortcuts. Hand-curated map of known scholarly
    //    works whose titles don't list specific books but whose scope
    //    is well-known. Matched as substrings against the normalized
    //    title (so "BDAG (3rd ed.)" still hits).
    for (const entry of REFERENCE_WORKS) {
        if (entry.match.some(needle => normalized.includes(needle))) {
            return { books: [], inferredScope: entry.scope };
        }
    }

    // 2. Multi-book phrases (Spanish + English). Higher priority than
    //    single-book matching because "Letters of John" should NOT
    //    resolve to just JHN by accident.
    for (const phrase of MULTI_BOOK_PHRASES) {
        if (phrase.match.some(needle => normalized.includes(needle))) {
            return { books: phrase.books, inferredScope: 'book' };
        }
    }

    // 3. Token-by-token book-name detection.
    const books = extractBooksFromTokens(normalized);
    if (books.length === 0) {
        return { books: [], inferredScope: null };
    }
    return { books, inferredScope: 'book' };
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Walk the tokens of the title and accumulate canonical book ids. Handles:
 *   - Numbered books: "1 Peter", "I Peter", "ii corinthians" — the
 *     numeric prefix is consumed together with the next token.
 *   - Multi-word names: "song of solomon", "1 chronicles".
 *   - Ambiguous bare aliases (jud, jn): SKIPPED unless they appeared
 *     with a numeric prefix that disambiguates (e.g. "1 jn" → 1JN).
 *   - De-duped output, in first-seen order.
 */
function extractBooksFromTokens(normalized: string): BibleBookId[] {
    const tokens = normalized.split(' ').filter(Boolean);
    const found: BibleBookId[] = [];
    const seen = new Set<BibleBookId>();

    let i = 0;
    while (i < tokens.length) {
        const numericPrefix = NUMERIC_PREFIXES[tokens[i]!];

        // Try the longest possible match (up to 3 tokens) starting at
        // the current cursor (after consuming an optional numeric prefix).
        const startBookCursor = numericPrefix !== undefined ? i + 1 : i;
        let matchedBook: BibleBookId | null = null;
        let matchedLength = 0;

        for (let span = MAX_BOOK_NAME_TOKENS; span >= 1; span--) {
            const end = startBookCursor + span;
            if (end > tokens.length) continue;
            const slice = tokens.slice(startBookCursor, end).join(' ');
            const candidate = resolveBookFromAlias(slice, numericPrefix);
            if (candidate) {
                matchedBook = candidate;
                matchedLength = span;
                break;
            }
        }

        if (matchedBook) {
            if (!seen.has(matchedBook)) {
                found.push(matchedBook);
                seen.add(matchedBook);
            }
            i = startBookCursor + matchedLength;
            continue;
        }
        i++;
    }

    return found;
}

/**
 * Resolve a normalized alias slice to a single book. Honors the
 * caller-supplied numeric prefix when the alias is ambiguous. Returns
 * null when:
 *   - alias unknown
 *   - alias ambiguous and no prefix to disambiguate (better to skip
 *     than pick wrong)
 *   - alias matched a numbered-book canonical name without a prefix
 *     (e.g. raw "peter" → 1PE/2PE both match "peter" via prefix; we
 *     skip rather than guess)
 */
function resolveBookFromAlias(
    alias: string,
    numericPrefix: number | undefined,
): BibleBookId | null {
    // First try: alias as-is. Catches whole names ("hebrews", "romans",
    // "song of solomon") and pre-numbered aliases ("1 peter", "2 corinthians").
    const direct = findBooksByAlias(alias);
    if (direct.length === 1) {
        return numericPrefix === undefined ? direct[0]!.id : null;
    }
    if (direct.length > 1) {
        // Ambiguous bare match — skip unless we have prefix context.
        // (E.g. "jud" matches both JDG and JUD; "jn" matches JON+JHN.)
        if (numericPrefix === undefined) return null;
    }

    // Second try: prefix + alias as a numbered-book lookup. Used when
    // the user wrote "1 peter" tokenized as ['1', 'peter'] — alias is
    // 'peter' here. Compose "${prefix} ${alias}" and look up.
    if (numericPrefix !== undefined) {
        const composed = `${numericPrefix} ${alias}`;
        const numbered = findBooksByAlias(composed);
        if (numbered.length === 1) return numbered[0]!.id;
    }
    return null;
}

const MAX_BOOK_NAME_TOKENS = 3; // "song of solomon", "1 chronicles + buffer"

const NUMERIC_PREFIXES: Record<string, number> = {
    '1': 1, '2': 2, '3': 3,
    'i': 1, 'ii': 2, 'iii': 3,
    'primera': 1, 'segunda': 2, 'tercera': 3,
    'first': 1, 'second': 2, 'third': 3,
};

interface ReferenceWorkEntry {
    /** Normalized substrings to match against the title. */
    match: string[];
    scope: LibraryResourceScope;
}

/**
 * Known scholarly reference works. Order matters only when entries
 * could overlap — keep the more specific ones first if you add overlap.
 *
 * `'whole-testament'` for NT-only / OT-only references is the safer
 * default (over `'whole-bible'`) because the smart-match query filters
 * by testament downstream — false-promoting a NT lexicon to whole-bible
 * would surface it for OT papers it can't actually help.
 */
const REFERENCE_WORKS: ReferenceWorkEntry[] = [
    // ── Greek (NT) lexicons / grammars ──────────────────────────────────
    { match: ['bdag'], scope: 'whole-testament' },
    { match: ['bdf'], scope: 'whole-testament' },
    { match: ['blass debrunner'], scope: 'whole-testament' },
    { match: ['louw nida', 'louw-nida'], scope: 'whole-testament' },
    { match: ['tdnt', 'kittel'], scope: 'whole-testament' },
    { match: ['nidnte', 'nidntte'], scope: 'whole-testament' },
    { match: ['exegetical dictionary of the new testament', 'edn'], scope: 'whole-testament' },
    { match: ['wallace greek grammar', 'greek grammar beyond the basics'], scope: 'whole-testament' },
    { match: ['mounce greek'], scope: 'whole-testament' },
    { match: ['na28', 'na 28', 'na29', 'na 29', 'nestle aland', 'nestle-aland'], scope: 'whole-testament' },
    { match: ['ubs5', 'ubs 5', 'ubs6', 'ubs 6'], scope: 'whole-testament' },
    { match: ['sblgnt', 'sbl gnt', 'sbl greek new testament'], scope: 'whole-testament' },
    { match: ['thgnt', 'tyndale house greek new testament'], scope: 'whole-testament' },
    { match: ['editio critica maior', 'ecm '], scope: 'whole-testament' },
    { match: ['lsj', 'liddell scott', 'liddell-scott'], scope: 'whole-testament' },
    { match: ['thayer'], scope: 'whole-testament' },
    // ── Hebrew (OT) lexicons / grammars ─────────────────────────────────
    { match: ['halot'], scope: 'whole-testament' },
    { match: ['bdb hebrew', 'brown driver briggs', 'brown-driver-briggs'], scope: 'whole-testament' },
    { match: ['gesenius'], scope: 'whole-testament' },
    { match: ['waltke o connor', "waltke o'connor", 'biblical hebrew syntax'], scope: 'whole-testament' },
    { match: ['joüon muraoka', 'jouon muraoka', 'joüon-muraoka'], scope: 'whole-testament' },
    { match: ['bhs', 'biblia hebraica stuttgartensia'], scope: 'whole-testament' },
    { match: ['bhq', 'biblia hebraica quinta'], scope: 'whole-testament' },
    { match: ['bhk', 'biblia hebraica kittel'], scope: 'whole-testament' },
    { match: ['dch', 'dictionary of classical hebrew'], scope: 'whole-testament' },
    { match: ['twot', 'theological wordbook of the old testament'], scope: 'whole-testament' },
    { match: ['tlot', 'theological lexicon of the old testament'], scope: 'whole-testament' },
    { match: ['nidotte', 'new international dictionary of old testament theology'], scope: 'whole-testament' },
    { match: ['rahlfs', 'göttingen septuaginta', 'gottingen septuaginta', 'septuaginta', 'septuagint', 'lxx '], scope: 'whole-testament' },
    // ── Whole-canon dictionaries / theologies ───────────────────────────
    { match: ['anchor bible dictionary', 'abd'], scope: 'whole-bible' },
    { match: ['ivp dictionary', 'dictionary of the old testament', 'dictionary of the new testament'], scope: 'whole-bible' },
    { match: ['systematic theology'], scope: 'whole-bible' },
    { match: ['biblia de estudio', 'study bible'], scope: 'whole-bible' },
];

/**
 * Multi-book phrases that resolve to a fixed set of canonical books.
 * Triggered before single-book token matching so "Letters of John"
 * doesn't accidentally resolve to JHN alone.
 */
interface MultiBookPhrase {
    match: string[];
    books: ReadonlyArray<BibleBookId>;
}

const MULTI_BOOK_PHRASES: MultiBookPhrase[] = [
    {
        match: ['letters of john', 'epistles of john', 'cartas de juan', 'epistolas de juan', 'johannine epistles', 'johannine letters'],
        books: ['1JN', '2JN', '3JN'],
    },
    {
        match: ['letters of peter', 'epistles of peter', 'cartas de pedro', 'epistolas de pedro', 'petrine epistles'],
        books: ['1PE', '2PE'],
    },
    {
        match: ['pastoral epistles', 'pastoral letters', 'epistolas pastorales', 'cartas pastorales'],
        books: ['1TI', '2TI', 'TIT'],
    },
    {
        match: ['corinthian correspondence', 'corinthian letters', 'epistolas corintias', 'cartas a los corintios'],
        books: ['1CO', '2CO'],
    },
    {
        match: ['thessalonian correspondence', 'cartas a los tesalonicenses'],
        books: ['1TH', '2TH'],
    },
    {
        match: ['minor prophets', 'profetas menores', 'twelve prophets', 'book of the twelve', 'doce profetas'],
        books: ['HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'],
    },
    {
        match: ['major prophets', 'profetas mayores'],
        books: ['ISA', 'JER', 'EZK', 'DAN'],
    },
    {
        match: ['pentateuch', 'pentateuco', 'torah', 'libros de moises', 'books of moses'],
        books: ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'],
    },
    {
        match: ['samuel kings', 'samuel-kings'],
        books: ['1SA', '2SA', '1KI', '2KI'],
    },
    {
        match: ['chronicles ezra nehemiah', 'cronicas esdras nehemias'],
        books: ['1CH', '2CH', 'EZR', 'NEH'],
    },
];

// Keep the alias index built so the first call doesn't pay the build
// cost mid-typing in the upload form.
void BIBLE_CANON;
