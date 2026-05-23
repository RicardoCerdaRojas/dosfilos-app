import type { BibleBookId } from '../canon/BibleCanon';

/**
 * Pastoral Fidelity — Bible cross-reference engine (Testigo 2).
 *
 * Implements ADR-008's TSK-based baseline: a lookup from any
 * `(book, chapter, verse)` triple to a list of canonical parallels.
 * Used by the three-witness mechanism (Phase 2) to surface convergent
 * Scripture against a pastor's central claim, and by the six-step
 * spine's "Reconocimiento" step (Phase 1) to suggest parallels.
 *
 * Storage layout: each source verse gets one Firestore document at
 * `/bibleCrossReferences/{book}-{chapter}-{verse}` (e.g. `JHN-1-1`).
 * Lookups by exact verse are O(1); range lookups (pericope) fan out
 * across the verses in the range.
 */

export type CrossReferenceType =
    /** Direct quotation of an earlier passage. */
    | 'quotation'
    /** Verbal/structural allusion without explicit quotation. */
    | 'allusion'
    /** Parallel teaching on the same theme. */
    | 'parallel'
    /** Thematic resonance — looser linkage. */
    | 'echo';

/**
 * A pointer from one verse to another. `targetRef` is the canonical
 * three-letter book id + chapter + verse, encoded as e.g. `GEN-1-1`.
 * `strength` is a 0..1 confidence score — for TSK-derived data this is
 * usually 1.0 (curated by editors); the embeddings extension in Phase 4
 * may emit fractional scores.
 */
export interface CrossReferenceLink {
    targetBook: BibleBookId;
    targetChapter: number;
    targetVerse: number;
    /** Verse range when the target spans multiple verses (inclusive). */
    targetVerseEnd?: number;
    strength: number;
    type: CrossReferenceType;
    /** Optional note from the editor (rare in TSK, common in curated additions). */
    note?: string;
}

export interface BibleCrossReferenceDoc {
    /**
     * Firestore document id — encodes the source verse. Format:
     *   `{BOOK}-{chapter}-{verse}` (e.g. `JHN-1-1`).
     * Stable + greppable + obvious in the Firestore console.
     */
    id: string;
    sourceBook: BibleBookId;
    sourceChapter: number;
    sourceVerse: number;
    parallels: CrossReferenceLink[];
    /** Convenience cache so callers don't re-derive `.length`. */
    count: number;
    /** Where this row came from — `tsk-v1`, `curated-2026`, `gemini-embedding-v1`, … */
    source: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Encode a verse triple to the Firestore doc id used by the engine.
 */
export function crossReferenceDocId(
    book: BibleBookId,
    chapter: number,
    verse: number,
): string {
    return `${book}-${chapter}-${verse}`;
}
