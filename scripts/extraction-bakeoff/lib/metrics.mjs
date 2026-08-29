/**
 * Mechanical scoring for extractor output.
 *
 * The point of this file is to replace "compare by eye" with numbers that
 * mean something for THIS corpus. A theological library lives or dies on
 * things a generic OCR benchmark never measures:
 *
 *   - polytonic Greek: a critical apparatus is worthless if the breathings
 *     and accents are stripped, and stripping them is invisible in a
 *     word-error-rate score because the letters are all still there;
 *   - pointed Hebrew: same story for niqqud and the cantillation marks;
 *   - page fidelity: a citation that says p. 322 must BE on p. 322.
 *
 * Every metric here is computed from the extractor's text alone, so it can
 * be run without a gold transcription. Where a metric needs a reference,
 * that is stated on the metric.
 */

// ── Unicode ranges ─────────────────────────────────────────────────────────
//
// Deliberately using property escapes for the scripts (so both the basic
// and the extended Greek blocks count as Greek) and explicit ranges for the
// mark classes, which is where the fidelity signal lives.

const RE_GREEK_LETTER = /\p{Script=Greek}/gu;
const RE_HEBREW_CHAR = /\p{Script=Hebrew}/gu;
/** Hebrew consonants, including the five final forms. */
const RE_HEBREW_CONSONANT = /[א-ת]/gu;
/** Niqqud — the vowel points. Excludes U+05BE maqaf and U+05C0 paseq (punctuation). */
const RE_NIQQUD = /[ְ-ׇֽֿׁׂ]/gu;
/** Te'amim — the cantillation accents carried by BHS and critical editions. */
const RE_CANTILLATION = /[֑-֯]/gu;
/** Generic combining diacritics — how Greek breathings/accents appear after NFD. */
const RE_COMBINING = /[̀-ͯ]/gu;
const RE_REPLACEMENT = /�/gu;

const count = (text, re) => (text.match(re) ?? []).length;

/**
 * Script fidelity — the premium tier's reason to exist.
 *
 * `greekDiacriticRatio` is computed on the NFD form on purpose. Polytonic
 * Greek can arrive either precomposed (ἀ = U+1F00) or decomposed
 * (α + U+0313), and an engine should not score differently for choosing a
 * normalization form. Decomposing first makes the question the one we
 * actually care about: did the marks survive at all?
 *
 * Reading the numbers:
 *   - Running polytonic Greek (NA28/SBLGNT) sits around 0.35–0.60. Nearly
 *     every word carries a breathing or an accent, but not every letter.
 *   - A ratio near 0 with a high `greekLetters` count is the signature of
 *     an engine that recognised the letters and threw the diacritics away.
 *     That output is unusable for exegesis and looks fine in a diff.
 *   - Pointed Hebrew (BHS) sits around 0.6–1.0 for niqqud. Above 0.2 for
 *     cantillation means the accents came through too.
 */
export function scriptFidelity(text) {
    const nfc = text.normalize('NFC');
    const nfd = text.normalize('NFD');

    const greekLetters = count(nfc, RE_GREEK_LETTER);
    // Count combining marks only in the neighbourhood of Greek: a Latin
    // corpus with accented Spanish would otherwise inflate the ratio.
    const greekDiacritics = countCombiningNear(nfd, /\p{Script=Greek}/u);

    const hebrewConsonants = count(nfc, RE_HEBREW_CONSONANT);
    const niqqud = count(nfc, RE_NIQQUD);
    const cantillation = count(nfc, RE_CANTILLATION);

    return {
        greekLetters,
        greekDiacritics,
        greekDiacriticRatio: ratio(greekDiacritics, greekLetters),
        hebrewChars: count(nfc, RE_HEBREW_CHAR),
        hebrewConsonants,
        niqqud,
        niqqudRatio: ratio(niqqud, hebrewConsonants),
        cantillation,
        cantillationRatio: ratio(cantillation, hebrewConsonants),
        replacementChars: count(nfc, RE_REPLACEMENT),
        orphanCombining: countOrphanCombining(nfd),
    };
}

/**
 * Combining marks whose base character belongs to `baseRe`.
 *
 * Walks the decomposed string and attributes each run of combining marks to
 * the last non-combining character seen, which is what a renderer does.
 */
function countCombiningNear(nfd, baseRe) {
    let total = 0;
    let baseIsMatch = false;
    for (const ch of nfd) {
        if (RE_COMBINING.test(ch)) {
            RE_COMBINING.lastIndex = 0;
            if (baseIsMatch) total++;
            continue;
        }
        RE_COMBINING.lastIndex = 0;
        baseIsMatch = baseRe.test(ch);
    }
    return total;
}

/**
 * Combining marks with no base character — at the start of the string or
 * straight after whitespace.
 *
 * A non-zero count means the extractor emitted marks detached from their
 * letters, which is a specific and nasty failure: the text looks almost
 * right, renders wrong, and destroys any downstream string match.
 */
function countOrphanCombining(nfd) {
    let orphans = 0;
    let prev = '';
    for (const ch of nfd) {
        const isCombining = /[̀-֑ͯ-ׇ]/u.test(ch);
        if (isCombining && (prev === '' || /\s/u.test(prev))) orphans++;
        prev = ch;
    }
    return orphans;
}

// ── Page integrity ─────────────────────────────────────────────────────────

const RE_PAGE_MARKER = /<!--\s*page:\s*(\d+)\s*-->/g;

/**
 * Verifies the `<!-- page: N -->` contract the chunker depends on.
 *
 * `expectedPages` comes from `pdfinfo`, so this is one of the few metrics
 * with a real reference. A page that the extractor never emitted is content
 * that silently does not exist in the index; a page emitted twice breaks
 * the citation anchor for everything after it.
 */
export function pageIntegrity(text, expectedPages) {
    const seen = [];
    for (const m of text.matchAll(RE_PAGE_MARKER)) seen.push(Number(m[1]));

    const unique = new Set(seen);
    const ascending = seen.every((n, i) => i === 0 || n > seen[i - 1]);
    const missing = [];
    if (expectedPages) {
        for (let p = 1; p <= expectedPages; p++) if (!unique.has(p)) missing.push(p);
    }

    const perPage = pageCharCounts(text);
    const emptyPages = Object.entries(perPage)
        .filter(([, chars]) => chars < 20)
        .map(([p]) => Number(p));

    return {
        markersFound: seen.length,
        uniquePages: unique.size,
        duplicated: seen.length !== unique.size,
        ascending,
        expectedPages: expectedPages ?? null,
        missingPages: missing,
        emptyPages,
        perPage,
    };
}

/** Character count per page, keyed by page number. */
export function pageCharCounts(text) {
    const out = {};
    const parts = text.split(RE_PAGE_MARKER);
    // split() with one capture group yields [pre, page, body, page, body, ...]
    for (let i = 1; i < parts.length; i += 2) {
        const page = Number(parts[i]);
        const body = (parts[i + 1] ?? '').trim();
        out[page] = body.length;
    }
    return out;
}

/** Per-page Greek + Hebrew letter counts — used to detect page drift. */
export function scriptDensityByPage(text) {
    const out = {};
    const parts = text.split(RE_PAGE_MARKER);
    for (let i = 1; i < parts.length; i += 2) {
        const page = Number(parts[i]);
        const body = parts[i + 1] ?? '';
        out[page] = {
            greek: count(body, RE_GREEK_LETTER),
            hebrew: count(body, RE_HEBREW_CONSONANT),
        };
    }
    return out;
}

/**
 * Page drift between two engines.
 *
 * If engine A puts Greek on page 40 and engine B does not, one of them has
 * its page numbering shifted — and a shifted page number is a citation that
 * points at the wrong place while looking perfectly plausible. Compares the
 * per-page script profile and reports pages where the two disagree sharply.
 *
 * Returns the fraction of pages that agree, plus the worst offenders.
 */
export function pageDrift(textA, textB, { minSignal = 5 } = {}) {
    const a = scriptDensityByPage(textA);
    const b = scriptDensityByPage(textB);
    const pages = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(Number).sort((x, y) => x - y);

    let compared = 0;
    let agree = 0;
    const disagreements = [];
    for (const p of pages) {
        const ga = a[p]?.greek ?? 0, gb = b[p]?.greek ?? 0;
        const ha = a[p]?.hebrew ?? 0, hb = b[p]?.hebrew ?? 0;
        // Only compare pages where at least one engine saw meaningful script.
        if (Math.max(ga, gb, ha, hb) < minSignal) continue;
        compared++;
        const bothGreek = (ga >= minSignal) === (gb >= minSignal);
        const bothHebrew = (ha >= minSignal) === (hb >= minSignal);
        if (bothGreek && bothHebrew) agree++;
        else disagreements.push({ page: p, greek: [ga, gb], hebrew: [ha, hb] });
    }

    return {
        comparedPages: compared,
        agreementRatio: ratio(agree, compared),
        disagreements: disagreements.slice(0, 20),
    };
}

// ── Structure ──────────────────────────────────────────────────────────────

/**
 * Markdown structure the chunker relies on. `headings` feeds the section
 * breadcrumb; `tableRows` matters because a lexicon entry or a critical
 * apparatus is frequently a table, and an engine that flattens it into
 * prose destroys the alignment between lemma and gloss.
 */
export function structure(text) {
    const headings = (text.match(/^#{1,6}\s+\S/gm) ?? []).length;
    const tableRows = (text.match(/^\s*\|.*\|\s*$/gm) ?? []).length;
    const tableSeparators = (text.match(/^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/gm) ?? []).length;
    return {
        headings,
        tableRows,
        tables: tableSeparators,
        // A heading level that jumps (# → ###) is what produced the sparse
        // `sectionPath` that broke indexing in production. Harmless now that
        // the chunker clamps depth, but worth reporting per engine: an engine
        // that emits a clean hierarchy gives a better breadcrumb.
        headingLevelJumps: countHeadingJumps(text),
    };
}

function countHeadingJumps(text) {
    const levels = [...text.matchAll(/^(#{1,6})\s+\S/gm)].map(m => m[1].length);
    let jumps = 0;
    for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 1) jumps++;
    }
    return jumps;
}

// ── Novelty (hallucination probe) ──────────────────────────────────────────

/**
 * Fraction of this engine's text that no other engine produced.
 *
 * NOT a hallucination score on its own, and it must not be read as one.
 * On a scanned page the honest OCR engine is the ONLY one with text, so it
 * scores 100% novel and is the correct answer. The metric earns its keep in
 * the opposite case: a page where every engine read the same embedded text
 * and one of them returns material the others do not have. That is where an
 * LLM-based extractor has been "helpful".
 *
 * `baselineHasText` says whether the reference (pdftotext) found embedded
 * text for this document; the report only flags novelty when it did.
 */
export function novelty(text, othersTexts, { n = 12 } = {}) {
    const mine = shingles(text, n);
    if (mine.size === 0) return { novelRatio: 0, sampleNovel: [] };

    const others = new Set();
    for (const t of othersTexts) for (const s of shingles(t, n)) others.add(s);

    const novel = [];
    for (const s of mine) if (!others.has(s)) novel.push(s);

    return {
        novelRatio: ratio(novel.length, mine.size),
        sampleNovel: novel.slice(0, 10),
    };
}

function shingles(text, n) {
    const norm = text
        .normalize('NFC')
        .replace(/<!--\s*page:\s*\d+\s*-->/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const out = new Set();
    for (let i = 0; i + n <= norm.length; i += 3) out.add(norm.slice(i, i + n));
    return out;
}

// ── Verdict ────────────────────────────────────────────────────────────────

/**
 * Turns the raw metrics into a premium-tier verdict for one engine.
 *
 * Thresholds are deliberately conservative and are stated in the report, so
 * a reader can disagree with them without re-running anything. This is a
 * triage aid, not an oracle: `INSPECT` means a human must look at the
 * side-by-side, and for a citation-fidelity product that look is mandatory
 * before adopting any engine.
 */
export function verdict(m, { expectGreek, expectHebrew }) {
    const notes = [];
    let fatal = false;

    if (m.script.replacementChars > 0) {
        notes.push(`${m.script.replacementChars} caracteres de reemplazo (�) — fallo de decodificación`);
        fatal = true;
    }
    if (m.script.orphanCombining > 5) {
        notes.push(`${m.script.orphanCombining} marcas diacríticas huérfanas — texto mal formado`);
        fatal = true;
    }
    if (expectGreek) {
        if (m.script.greekLetters === 0) {
            notes.push('no recuperó NADA de griego');
            fatal = true;
        } else if (m.script.greekDiacriticRatio < 0.15) {
            notes.push(`griego sin diacríticos (ratio ${m.script.greekDiacriticRatio.toFixed(3)}) — inservible para exégesis`);
            fatal = true;
        }
    }
    if (expectHebrew) {
        if (m.script.hebrewConsonants === 0) {
            notes.push('no recuperó NADA de hebreo');
            fatal = true;
        } else if (m.script.niqqudRatio < 0.15) {
            notes.push(`hebreo sin puntuación vocálica (ratio ${m.script.niqqudRatio.toFixed(3)})`);
            fatal = true;
        }
    }
    if (m.page.missingPages.length > 0) {
        notes.push(`${m.page.missingPages.length} página(s) sin emitir: ${m.page.missingPages.slice(0, 8).join(', ')}`);
        fatal = true;
    }
    if (m.page.duplicated) {
        notes.push('marcadores de página duplicados — el ancla de cita no es fiable');
        fatal = true;
    }
    if (!m.page.ascending) {
        notes.push('marcadores de página fuera de orden');
        fatal = true;
    }
    if (m.page.emptyPages.length > 0) {
        notes.push(`${m.page.emptyPages.length} página(s) vacías`);
    }

    return { status: fatal ? 'NO APTO' : 'INSPECCIONAR', notes };
}

function ratio(num, den) {
    if (!den) return 0;
    return num / den;
}
