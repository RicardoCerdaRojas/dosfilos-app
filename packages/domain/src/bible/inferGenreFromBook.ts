import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';
import type { BibleBookId } from './canon/BibleCanon';

/**
 * Pastoral Fidelity Phase 1.6 (ADR-024) — deterministic literary-genre
 * proposal for the Contexto/Género step (paso 2).
 *
 * Genre governs the rules of reading, so the step proposes it *before*
 * structural analysis. This map is the v1 proposal: deterministic, zero
 * LLM cost, and impossible to hallucinate. The pastor always confirms (or
 * overrides) the proposal — `contextGenre.genreConfirmed` gates the step.
 *
 * The richer `BookPanorama` LLM reuse (full outline + movements) is a
 * documented follow-up; this map keeps the step functional now without
 * wiring the multi-pass expository pipeline into a single-pericope flow.
 *
 * `mixed` is used where a book's primary genre is genuinely contested or
 * shifts (Daniel: narrative + apocalyptic).
 */
const GENRE_BY_BOOK: Record<BibleBookId, LiteraryGenre> = {
    // Pentateuch
    GEN: 'narrative', EXO: 'narrative', LEV: 'law', NUM: 'narrative', DEU: 'law',
    // Historical
    JOS: 'narrative', JDG: 'narrative', RUT: 'narrative',
    '1SA': 'narrative', '2SA': 'narrative', '1KI': 'narrative', '2KI': 'narrative',
    '1CH': 'narrative', '2CH': 'narrative', EZR: 'narrative', NEH: 'narrative', EST: 'narrative',
    // Wisdom & poetry
    JOB: 'wisdom', PSA: 'poetry', PRO: 'wisdom', ECC: 'wisdom', SNG: 'poetry',
    // Prophets
    ISA: 'prophecy', JER: 'prophecy', LAM: 'poetry', EZK: 'prophecy', DAN: 'mixed',
    HOS: 'prophecy', JOL: 'prophecy', AMO: 'prophecy', OBA: 'prophecy', JON: 'narrative',
    MIC: 'prophecy', NAM: 'prophecy', HAB: 'prophecy', ZEP: 'prophecy', HAG: 'prophecy',
    ZEC: 'prophecy', MAL: 'prophecy',
    // Gospels & Acts
    MAT: 'gospel', MRK: 'gospel', LUK: 'gospel', JHN: 'gospel', ACT: 'narrative',
    // Epistles
    ROM: 'epistle', '1CO': 'epistle', '2CO': 'epistle', GAL: 'epistle', EPH: 'epistle',
    PHP: 'epistle', COL: 'epistle', '1TH': 'epistle', '2TH': 'epistle', '1TI': 'epistle',
    '2TI': 'epistle', TIT: 'epistle', PHM: 'epistle', HEB: 'epistle', JAS: 'epistle',
    '1PE': 'epistle', '2PE': 'epistle', '1JN': 'epistle', '2JN': 'epistle', '3JN': 'epistle',
    JUD: 'epistle',
    // Apocalypse
    REV: 'apocalypse',
};

/** Spanish display label for each literary genre. */
export const LITERARY_GENRE_LABELS_ES: Record<LiteraryGenre, string> = {
    epistle: 'Epístola',
    narrative: 'Narrativa',
    poetry: 'Poesía',
    prophecy: 'Profecía',
    wisdom: 'Sabiduría',
    gospel: 'Evangelio',
    apocalypse: 'Apocalíptica',
    law: 'Ley',
    mixed: 'Mixto',
};

/** Proposes a literary genre for a canon book id. Returns `mixed` if unknown. */
export function inferGenreFromBook(bookId: BibleBookId): LiteraryGenre {
    return GENRE_BY_BOOK[bookId] ?? 'mixed';
}
