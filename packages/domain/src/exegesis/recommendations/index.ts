import type { BibleBookId } from '../../bible/canon/BibleCanon';
import type { SourceType } from '../entities/SourceType';
import { INVARIANT_RECOMMENDATIONS } from './invariant';
import { HEBREWS_RECOMMENDATIONS } from './nt/hebrews';
import { ROMANS_RECOMMENDATIONS } from './nt/romans';
import type { BookRecommendations, SourceRecommendation } from './types';

export type { BookRecommendations, SourceRecommendation } from './types';

/**
 * Master catalog indexed by `BibleBookId`. v1.7 launch covers two
 * hero books (Hebreos + Romanos) with full per-source-type curation.
 * The remaining ~50 prioritized books from the spec are added
 * incrementally — telemetry from `recommendation_gap_no_suggestions`
 * tells us which to curate next.
 *
 * Books NOT in this map fall through to invariant-only recommendations
 * (lexicons, grammars, dictionaries) — still useful, just not as rich
 * as a curated hero book.
 */
const RECOMMENDATIONS_BY_BOOK: Partial<Record<BibleBookId, BookRecommendations>> = {
    HEB: HEBREWS_RECOMMENDATIONS,
    ROM: ROMANS_RECOMMENDATIONS,
};

/**
 * Returns recommendations for `(bookId × sourceType)`, sorted with the
 * most relevant entries first.
 *
 * Sort priority:
 *   1. Book-specific entries before invariant entries (Cockerill on
 *      Hebreos beats BDAG when the type allows both).
 *   2. Within each group, language match for the user's language wins
 *      (ES papers see ES editions first when they exist).
 *   3. Within each language tier, academic tier (essential >
 *      recommended > standard).
 *
 * Returns an empty array when neither the book nor the invariant catalog
 * has anything for the source type — caller surfaces a "no curation yet,
 * give us feedback" empty state and emits a telemetry event.
 */
export function getSourceRecommendations(
    bookId: BibleBookId,
    sourceType: SourceType,
    language: 'es' | 'en' = 'es',
): ReadonlyArray<SourceRecommendation> {
    const bookSpecific = RECOMMENDATIONS_BY_BOOK[bookId]?.bySourceType[sourceType] ?? [];
    const invariant = INVARIANT_RECOMMENDATIONS[sourceType] ?? [];
    if (bookSpecific.length === 0 && invariant.length === 0) return [];

    // Sort within each segment, then concatenate. Stable sort preserves
    // the original curator-chosen order when two entries tie on
    // language + tier.
    const tierOrder: Record<SourceRecommendation['tier'], number> = {
        essential: 0,
        recommended: 1,
        standard: 2,
    };
    const sorter = (a: SourceRecommendation, b: SourceRecommendation): number => {
        const aLang = a.languages.includes(language) ? 0 : 1;
        const bLang = b.languages.includes(language) ? 0 : 1;
        if (aLang !== bLang) return aLang - bLang;
        return tierOrder[a.tier] - tierOrder[b.tier];
    };
    return [
        ...[...bookSpecific].sort(sorter),
        ...[...invariant].sort(sorter),
    ];
}

/**
 * True when the catalog has at least one curated entry (book-specific
 * OR invariant) for the given combination. Cheap helper for the UI to
 * decide whether to render the toggle at all vs. show "no curation".
 */
export function hasSourceRecommendations(bookId: BibleBookId, sourceType: SourceType): boolean {
    const bookSpecific = RECOMMENDATIONS_BY_BOOK[bookId]?.bySourceType[sourceType];
    if (bookSpecific && bookSpecific.length > 0) return true;
    const invariant = INVARIANT_RECOMMENDATIONS[sourceType];
    return !!invariant && invariant.length > 0;
}

/**
 * Stable id for a recommendation. Used for "ya la tengo" persistence
 * and telemetry. We hash author + title (case-insensitive, normalized)
 * so editing the rationale or fixing a typo doesn't lose the user's
 * "ya la tengo" flag. ISBN would be ideal but many entries don't have one.
 */
export function getRecommendationId(rec: SourceRecommendation): string {
    const author = rec.author.toLowerCase().replace(/[^a-z0-9]/g, '');
    const title = rec.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${author}__${title}`;
}
