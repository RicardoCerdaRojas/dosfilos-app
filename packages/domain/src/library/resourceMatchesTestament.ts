import { getBookById, type Testament } from '../bible/canon/BibleCanon';
import type { LibraryResource } from '../entities/LibraryResource';

/**
 * Returns true when the resource is a plausible candidate for a paper
 * studying the given testament. Used by the corpus library picker to
 * narrow the list to NT-relevant resources when the paper's passage
 * is in the NT (and vice versa for OT).
 *
 * Conservative on purpose — resources without enough coverage info
 * to decide are kept visible. The filter aims to remove obvious
 * mismatches (HALOT on a NT paper, BDAG on an OT paper) without
 * accidentally hiding a useful general resource.
 *
 * Decision matrix:
 *   - `scope === 'whole-bible'`            → always visible (covers both testaments).
 *   - `scope === 'whole-testament'` AND
 *     `coversBibleBooks` empty             → visible (insufficient info; we
 *                                            can't tell which testament).
 *   - `scope === 'book' | 'pericope'` OR
 *     `coversBibleBooks` populated         → visible IFF any covered book
 *                                            belongs to the requested testament.
 *   - no scope / no coverage (legacy)      → visible (don't penalize unspecified).
 */
export function resourceMatchesTestament(
    resource: Pick<LibraryResource, 'coversBibleBooks' | 'scope'>,
    testament: Testament,
): boolean {
    if (resource.scope === 'whole-bible') return true;

    const books = resource.coversBibleBooks;
    if (!books || books.length === 0) return true;

    return books.some(bookId => getBookById(bookId)?.testament === testament);
}
