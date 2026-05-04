import type { BibleBookId } from '../../../bible/canon/BibleCanon';
import type { SourceType } from '../../entities/SourceType';
import type { SourceRecommendation } from '../types';

/**
 * Canonical groupings used to share group-level bibliographic
 * recommendations across multiple Bible books. A book can belong to
 * MORE THAN ONE group — e.g. Daniel is both `'major-prophets'` and
 * `'apocalyptic'`; John's Gospel is both `'gospels'` and
 * `'johannine-literature'`. The helper accumulates recommendations
 * from every group a book belongs to, then de-duplicates.
 *
 * Why a third merge layer (book → group → invariant): a lot of the
 * highest-impact bibliographic tradition is genuinely written ABOUT
 * a group, not a single book — Smith's Minor Prophets WBC covers all
 * twelve in two volumes; Murphy's "Tree of Life" treats the wisdom
 * corpus as a unit; Sanders' "Paul and Palestinian Judaism" is THE
 * Paul work but doesn't belong to any single epistle. Without this
 * layer those works would either be missing from most papers or
 * duplicated 12 times across the catalog.
 */
export type BibleBookGroup =
    // ── Old Testament ──────────────────────────────────────────────────
    | 'pentateuch'
    | 'historical-books'
    | 'wisdom'
    | 'major-prophets'
    | 'minor-prophets'
    // ── New Testament ──────────────────────────────────────────────────
    | 'gospels'
    | 'synoptic-gospels'
    | 'johannine-literature'
    | 'pauline-epistles'
    | 'pastoral-epistles'
    | 'general-epistles'
    | 'apocalyptic';

/**
 * Recommendations curated for a whole biblical group. Same shape as
 * `BookRecommendations` minus the book id (the group id stands in
 * for the scope identifier).
 */
export interface GroupRecommendations {
    groupId: BibleBookGroup;
    bySourceType: Partial<Record<SourceType, ReadonlyArray<SourceRecommendation>>>;
}

/**
 * Per-book mapping to one or more groups. Used by
 * `getSourceRecommendations` to pull the right group catalogs for a
 * given paper's passage. Books NOT in this map fall through to
 * invariant-only recommendations (which is fine — that means the
 * book sits outside all curated groups too).
 */
export const BOOK_TO_GROUPS: Partial<Record<BibleBookId, ReadonlyArray<BibleBookGroup>>> = {
    // ── Pentateuco ──────────────────────────────────────────────────────
    GEN: ['pentateuch'],
    EXO: ['pentateuch'],
    LEV: ['pentateuch'],
    NUM: ['pentateuch'],
    DEU: ['pentateuch'],
    // ── Históricos ──────────────────────────────────────────────────────
    JOS: ['historical-books'],
    JDG: ['historical-books'],
    RUT: ['historical-books'],
    '1SA': ['historical-books'],
    '2SA': ['historical-books'],
    '1KI': ['historical-books'],
    '2KI': ['historical-books'],
    '1CH': ['historical-books'],
    '2CH': ['historical-books'],
    EZR: ['historical-books'],
    NEH: ['historical-books'],
    EST: ['historical-books'],
    // ── Sapienciales / poéticos ────────────────────────────────────────
    JOB: ['wisdom'],
    PSA: ['wisdom'],
    PRO: ['wisdom'],
    ECC: ['wisdom'],
    SNG: ['wisdom'],
    // ── Profetas mayores ────────────────────────────────────────────────
    ISA: ['major-prophets'],
    JER: ['major-prophets'],
    LAM: ['major-prophets'],
    EZK: ['major-prophets'],
    DAN: ['major-prophets', 'apocalyptic'],
    // ── Profetas menores (Los Doce) ─────────────────────────────────────
    HOS: ['minor-prophets'],
    JOL: ['minor-prophets'],
    AMO: ['minor-prophets'],
    OBA: ['minor-prophets'],
    JON: ['minor-prophets'],
    MIC: ['minor-prophets'],
    NAM: ['minor-prophets'],
    HAB: ['minor-prophets'],
    ZEP: ['minor-prophets'],
    HAG: ['minor-prophets'],
    ZEC: ['minor-prophets'],
    MAL: ['minor-prophets'],
    // ── Evangelios ──────────────────────────────────────────────────────
    MAT: ['gospels', 'synoptic-gospels'],
    MRK: ['gospels', 'synoptic-gospels'],
    LUK: ['gospels', 'synoptic-gospels'],
    JHN: ['gospels', 'johannine-literature'],
    // ── Hechos (parte del corpus Lucas-Hechos pero también su propio caso) ──
    // Sin grupo específico — los recursos lucanos quedan en la sección
    // de gospels/synoptic; Hechos como tal usa invariantes + cualquier
    // libro hero que tenga (none yet).
    // ── Cartas paulinas ─────────────────────────────────────────────────
    ROM: ['pauline-epistles'],
    '1CO': ['pauline-epistles'],
    '2CO': ['pauline-epistles'],
    GAL: ['pauline-epistles'],
    EPH: ['pauline-epistles'],
    PHP: ['pauline-epistles'],
    COL: ['pauline-epistles'],
    '1TH': ['pauline-epistles'],
    '2TH': ['pauline-epistles'],
    '1TI': ['pauline-epistles', 'pastoral-epistles'],
    '2TI': ['pauline-epistles', 'pastoral-epistles'],
    TIT: ['pauline-epistles', 'pastoral-epistles'],
    PHM: ['pauline-epistles'],
    // ── Hebreos: técnicamente no paulina pero categoría aparte ─────────
    // (queda solo con su hero book + invariantes; ningún grupo aplica
    // limpiamente — la tradición la coloca aparte).
    // ── Cartas universales (universales) ────────────────────────────────
    JAS: ['general-epistles'],
    '1PE': ['general-epistles'],
    '2PE': ['general-epistles'],
    '1JN': ['general-epistles', 'johannine-literature'],
    '2JN': ['general-epistles', 'johannine-literature'],
    '3JN': ['general-epistles', 'johannine-literature'],
    JUD: ['general-epistles'],
    // ── Apocalíptica / Apocalipsis ──────────────────────────────────────
    REV: ['apocalyptic', 'johannine-literature'],
};
