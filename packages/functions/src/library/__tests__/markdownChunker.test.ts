import { describe, it, expect } from 'vitest';
import { chunkStructuredMarkdown } from '../markdownChunker';

/**
 * Regression guard for the bug that killed the RAG index of a 425-page
 * commentary (`The Minor Prophets`, 2026-08-29).
 *
 * The chunker used to set `headingStack.length = headingLevel - 1` before
 * pushing. When the markdown SKIPPED a heading level (`#` → `###`, with no
 * `##`), growing the array that way left a HOLE, and the `[...headingStack]`
 * spread materialised it as `undefined`. Firestore then rejected the chunk
 * write outright:
 *
 *   Cannot use "undefined" as a Firestore value
 *   (found in field "metadata.sectionPath.`1`")
 *
 * That aborted the write loop after the embeddings had already been paid
 * for, leaving the resource at `indexingStatus: 'failed'` with zero chunks.
 */
describe('chunkStructuredMarkdown — sectionPath integrity', () => {
    const body = (label: string) => `${label} `.repeat(60);

    it('never emits a hole when the document skips a heading level', () => {
        const markdown = [
            '<!-- page: 1 -->',
            '# PART ONE: THE BOOK OF JONAH',
            body('intro'),
            '### Jonah 1:1-3 — The Call and the Flight',
            body('exposition'),
        ].join('\n\n');

        const chunks = chunkStructuredMarkdown(markdown);
        expect(chunks.length).toBeGreaterThan(0);

        for (const c of chunks) {
            // `.every` skips holes in a sparse array, so assert on length
            // and on each index explicitly — this is what Firestore does.
            for (let i = 0; i < c.sectionPath.length; i++) {
                expect(c.sectionPath[i]).toBeTypeOf('string');
            }
        }
    });

    it('collapses the skipped level into a contiguous breadcrumb', () => {
        const markdown = [
            '<!-- page: 1 -->',
            '# PART ONE',
            '### Jonah 1:1-3',
            body('exposition'),
        ].join('\n\n');

        const last = chunkStructuredMarkdown(markdown).at(-1)!;
        expect(last.sectionPath).toEqual(['PART ONE', 'Jonah 1:1-3']);
    });

    it('still pops back to a shallower level correctly', () => {
        const markdown = [
            '<!-- page: 1 -->',
            '# PART ONE',
            '### Jonah 1:1-3',
            body('a'),
            '## Chapter Two',
            body('b'),
            '# PART TWO',
            body('c'),
        ].join('\n\n');

        const chunks = chunkStructuredMarkdown(markdown);
        const pathFor = (heading: string) =>
            chunks.find(c => c.sectionPath.at(-1) === heading)?.sectionPath;

        expect(pathFor('Jonah 1:1-3')).toEqual(['PART ONE', 'Jonah 1:1-3']);
        expect(pathFor('Chapter Two')).toEqual(['PART ONE', 'Chapter Two']);
        expect(pathFor('PART TWO')).toEqual(['PART TWO']);
    });

    it('handles a document that opens at a deep level with no ancestors', () => {
        const markdown = [
            '<!-- page: 1 -->',
            '#### Deeply Nested Opening',
            body('orphan'),
        ].join('\n\n');

        const last = chunkStructuredMarkdown(markdown).at(-1)!;
        expect(last.sectionPath).toEqual(['Deeply Nested Opening']);
        expect(last.sectionPath).not.toContain(undefined);
    });
});
