/**
 * Pastoral Fidelity — Phase 3 PR 3 (ADR-029 §Q4) — pure plurality check.
 *
 * The no-proof-texting rule: a doctrinally substantive claim (`core` or
 * `distinctive` — never `open-evangelical`) must be grounded on at least
 * `PLURALITY_MIN_PASSAGES` DISTINCT biblical passages. A claim that rests on
 * a single passage is a proof-texting risk and is surfaced as a failure,
 * which the gate treats as a soft-block (overridable with justification).
 *
 * Pure — no I/O, no clock. Pinned by unit tests.
 */

import type {
    PassageRef,
    PluralityReport,
    SubstantiveClaim,
} from '../entities/FidelityReport';
import { PLURALITY_MIN_PASSAGES } from '../entities/FidelityReport';

/**
 * Distinctness key for a passage. Two refs that point at the same
 * book+chapter+startVerse count once toward plurality — citing "Juan 1:1"
 * twice is still one witness. Falls back to the normalized label when the
 * structured fields are absent.
 */
function passageKey(ref: PassageRef): string {
    const book = ref.book.trim().toLowerCase();
    if (book && Number.isFinite(ref.chapter)) {
        return `${book}|${ref.chapter}|${ref.verseStart ?? ''}`;
    }
    return ref.label.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Count of distinct passages backing a claim. */
function distinctPassageCount(claim: SubstantiveClaim): number {
    const keys = new Set<string>();
    for (const ref of claim.biblicalSources) {
        keys.add(passageKey(ref));
    }
    return keys.size;
}

/**
 * A claim is held to the two-witness bar only when it is doctrinally
 * substantive at the `core` or `distinctive` level. `open-evangelical`
 * positions are matters of liberty and are exempt.
 */
function isGovernedByPlurality(claim: SubstantiveClaim): boolean {
    return claim.detectedLevel === 'core' || claim.detectedLevel === 'distinctive';
}

/**
 * Compute the plurality sub-report from the tagged substantive claims.
 * Pure. The caller attaches the result to the `FidelityReport` and passes
 * `failures.length > 0` to `computeFidelitySummary` as `pluralityHasFailures`.
 */
export function computePluralityCheck(claims: SubstantiveClaim[]): PluralityReport {
    const failures = claims.filter(
        (claim) =>
            isGovernedByPlurality(claim) &&
            distinctPassageCount(claim) < PLURALITY_MIN_PASSAGES,
    );
    return { substantiveClaims: claims, failures };
}
