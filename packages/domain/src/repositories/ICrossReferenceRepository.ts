import type { BibleBookId } from '../bible/canon/BibleCanon';
import type { BibleCrossReferenceDoc } from '../bible/cross-references/CrossReference';

export interface VerseLookupRequest {
    book: BibleBookId;
    chapter: number;
    verse: number;
}

export interface RangeLookupRequest {
    book: BibleBookId;
    chapter: number;
    startVerse: number;
    endVerse: number;
}

/**
 * Cross-reference engine port (ADR-008). Reads only — the dataset is
 * populated by the `ingestCrossReferences` Cloud Function and the
 * admin tester, never by client traffic.
 */
export interface ICrossReferenceRepository {
    /** Returns the doc for an exact verse, or null when unindexed. */
    findByVerse(req: VerseLookupRequest): Promise<BibleCrossReferenceDoc | null>;
    /** Returns one doc per source verse in the range, aggregated by caller. */
    findByRange(req: RangeLookupRequest): Promise<BibleCrossReferenceDoc[]>;
}
