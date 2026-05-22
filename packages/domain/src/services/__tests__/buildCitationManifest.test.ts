import { describe, it, expect } from 'vitest';
import { buildCitationManifest } from '../buildCitationManifest';
import type { DocumentChunkData } from '../../entities/DocumentChunk';

function chunk(partial: Partial<DocumentChunkData> & { id: string }): DocumentChunkData {
    return {
        id: partial.id,
        resourceId: partial.resourceId ?? `res-${partial.id}`,
        resourceTitle: partial.resourceTitle ?? `Title ${partial.id}`,
        resourceAuthor: partial.resourceAuthor ?? `Author ${partial.id}`,
        userId: 'u',
        chunkIndex: 0,
        text: partial.text ?? 'Some excerpt text.',
        metadata: partial.metadata ?? {},
        createdAt: new Date(0),
    };
}

describe('buildCitationManifest', () => {
    it('returns version 1 with empty entries for no chunks', () => {
        const manifest = buildCitationManifest([]);
        expect(manifest).toEqual({ version: '1', entries: [] });
    });

    it('numbers entries S1..SN preserving input order', () => {
        const manifest = buildCitationManifest([
            chunk({ id: 'c1' }),
            chunk({ id: 'c2' }),
            chunk({ id: 'c3' }),
        ]);
        expect(manifest.entries.map((e) => e.sourceId)).toEqual(['S1', 'S2', 'S3']);
        expect(manifest.entries.map((e) => e.chunkId)).toEqual(['c1', 'c2', 'c3']);
    });

    it('caps at maxEntries (default 10)', () => {
        const chunks = Array.from({ length: 15 }, (_, i) => chunk({ id: `c${i}` }));
        const manifest = buildCitationManifest(chunks);
        expect(manifest.entries).toHaveLength(10);
        expect(manifest.entries[9].sourceId).toBe('S10');
    });

    it('respects custom maxEntries', () => {
        const chunks = Array.from({ length: 5 }, (_, i) => chunk({ id: `c${i}` }));
        const manifest = buildCitationManifest(chunks, { maxEntries: 3 });
        expect(manifest.entries).toHaveLength(3);
    });

    it('truncates excerpts past maxExcerptLength on a word boundary', () => {
        const longText = 'palabra '.repeat(100); // ~800 chars
        const manifest = buildCitationManifest([chunk({ id: 'c1', text: longText })]);
        expect(manifest.entries[0].excerpt.length).toBeLessThanOrEqual(281);
        expect(manifest.entries[0].excerpt.endsWith('…')).toBe(true);
        expect(manifest.entries[0].excerpt.includes('  ')).toBe(false);
    });

    it('keeps short excerpts verbatim (no ellipsis)', () => {
        const manifest = buildCitationManifest([chunk({ id: 'c1', text: 'Short.' })]);
        expect(manifest.entries[0].excerpt).toBe('Short.');
    });

    it('normalizes internal whitespace in excerpt', () => {
        const manifest = buildCitationManifest([
            chunk({ id: 'c1', text: '  Hello \n\n  world.\t' }),
        ]);
        expect(manifest.entries[0].excerpt).toBe('Hello world.');
    });

    it('omits author when blank', () => {
        const manifest = buildCitationManifest([chunk({ id: 'c1', resourceAuthor: '   ' })]);
        expect(manifest.entries[0].author).toBeUndefined();
    });

    it('serializes page number from metadata', () => {
        const manifest = buildCitationManifest([
            chunk({ id: 'c1', metadata: { page: 42 } }),
            chunk({ id: 'c2', metadata: {} }),
        ]);
        expect(manifest.entries[0].page).toBe('42');
        expect(manifest.entries[1].page).toBeUndefined();
    });
});
