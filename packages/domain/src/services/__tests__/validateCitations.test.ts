import { describe, it, expect } from 'vitest';
import { validateCitations } from '../validateCitations';
import type {
    CitationManifest,
    CitationManifestEntry,
    RAGSource,
    SermonContent,
} from '../../entities/SermonGenerator';

function manifestEntry(n: number, partial?: Partial<CitationManifestEntry>): CitationManifestEntry {
    return {
        sourceId: `S${n}`,
        resourceId: `res-${n}`,
        chunkId: `chunk-${n}`,
        title: `Title ${n}`,
        author: `Author ${n}`,
        page: `${n}`,
        excerpt: `Excerpt for source ${n}`,
        ...partial,
    };
}

function manifestOf(n: number): CitationManifest {
    return {
        version: '1',
        entries: Array.from({ length: n }, (_, i) => manifestEntry(i + 1)),
    };
}

function baseContent(partial: Partial<SermonContent> = {}): SermonContent {
    return {
        title: 'Test sermon',
        introduction: '',
        body: [],
        conclusion: '',
        ragSources: [],
        ...partial,
    };
}

function rag(sourceId: string | undefined, partial?: Partial<RAGSource>): RAGSource {
    return {
        title: partial?.title ?? `Title ${sourceId ?? 'none'}`,
        author: partial?.author,
        page: partial?.page,
        usedFor: partial?.usedFor ?? 'context',
        sourceId,
    };
}

describe('validateCitations', () => {
    it('returns content unchanged when there are no markers or ragSources', () => {
        const content = baseContent({
            introduction: 'No citations here.',
            conclusion: 'Still nothing.',
        });
        const result = validateCitations(content, manifestOf(2));
        expect(result.content.introduction).toBe('No citations here.');
        expect(result.content.conclusion).toBe('Still nothing.');
        expect(result.manifest.entries).toEqual([]);
        expect(result.bibliography).toEqual([]);
        expect(result.stats.markersValid).toBe(0);
        expect(result.stats.markersDropped).toBe(0);
    });

    it('keeps valid bare-ordinal markers and renumbers when subset is cited', () => {
        const content = baseContent({
            introduction: 'God is love [2].',
            body: [
                { point: 'P1', content: 'See [2] again.' },
            ],
        });
        const result = validateCitations(content, manifestOf(3));
        expect(result.content.introduction).toBe('God is love [1].');
        expect(result.content.body[0].content).toBe('See [1] again.');
        expect(result.manifest.entries).toHaveLength(1);
        expect(result.manifest.entries[0].sourceId).toBe('S1');
        expect(result.manifest.entries[0].title).toBe('Title 2');
        expect(result.stats.markersValid).toBe(2);
        expect(result.stats.markersDropped).toBe(0);
        expect(result.stats.surfaces).toEqual(expect.arrayContaining(['introduction', 'body']));
    });

    it('accepts [Sn] syntax and normalizes to [n]', () => {
        const content = baseContent({
            introduction: 'As Wallace notes [S2], ...',
        });
        const result = validateCitations(content, manifestOf(2));
        expect(result.content.introduction).toBe('As Wallace notes [1], ...');
        expect(result.manifest.entries[0].title).toBe('Title 2');
    });

    it('preserves multi-cite groups and drops unknown numbers within them', () => {
        const content = baseContent({
            introduction: 'Per [1, 99] and [2, 3].',
        });
        const result = validateCitations(content, manifestOf(3));
        expect(result.content.introduction).toBe('Per [1] and [2, 3].');
        expect(result.stats.markersValid).toBe(3);
        expect(result.stats.markersDropped).toBe(1);
    });

    it('strips a marker entirely when no IDs survive', () => {
        const content = baseContent({
            introduction: 'Bogus [42] here.',
        });
        const result = validateCitations(content, manifestOf(2));
        expect(result.content.introduction).toBe('Bogus  here.');
        expect(result.stats.markersDropped).toBe(1);
        expect(result.manifest.entries).toEqual([]);
    });

    it('leaves non-citation brackets alone (Bible reference links, plain text)', () => {
        const content = baseContent({
            introduction: 'See [📖 Juan 1:1](#bible-juan-1-1) and [author note].',
        });
        const result = validateCitations(content, manifestOf(1));
        expect(result.content.introduction).toBe(
            'See [📖 Juan 1:1](#bible-juan-1-1) and [author note].',
        );
        expect(result.stats.markersValid).toBe(0);
        expect(result.stats.markersDropped).toBe(0);
    });

    it('drops ragSources without sourceId', () => {
        const content = baseContent({
            ragSources: [
                rag(undefined, { title: 'Junk' }),
                rag('S1'),
            ],
        });
        const result = validateCitations(content, manifestOf(1));
        expect(result.bibliography).toHaveLength(1);
        expect(result.bibliography[0].sourceId).toBe('S1');
        expect(result.stats.droppedEntries).toHaveLength(1);
        expect(result.stats.droppedEntries[0].reason).toBe('no-id');
    });

    it('drops ragSources with unknown sourceId', () => {
        const content = baseContent({
            ragSources: [
                rag('S99', { title: 'Hallucinated' }),
                rag('S2'),
            ],
        });
        const result = validateCitations(content, manifestOf(2));
        expect(result.bibliography).toHaveLength(1);
        expect(result.bibliography[0].title).toBe('Title S2');
        expect(result.stats.droppedEntries).toHaveLength(1);
        expect(result.stats.droppedEntries[0].reason).toBe('unknown-id');
    });

    it('synthesizes a ragSources entry when the marker is cited but LLM omitted the source', () => {
        const content = baseContent({
            introduction: 'Citing [2] only in prose.',
            ragSources: [],
        });
        const result = validateCitations(content, manifestOf(3));
        expect(result.bibliography).toHaveLength(1);
        expect(result.bibliography[0].sourceId).toBe('S1');
        expect(result.bibliography[0].title).toBe('Title 2');
        expect(result.bibliography[0].usedFor).toBe('Citado en el sermón');
    });

    it('renumbers across prose, manifest, and ragSources consistently when middle entries are dropped', () => {
        const content = baseContent({
            introduction: 'Start with [1] and [3].',
            conclusion: 'Reference [3] again.',
            ragSources: [
                rag('S1'),
                rag('S2'), // not cited in prose — still kept because in ragSources
                rag('S3'),
            ],
        });
        const result = validateCitations(content, manifestOf(3));
        expect(result.content.introduction).toBe('Start with [1] and [3].');
        expect(result.content.conclusion).toBe('Reference [3] again.');
        expect(result.manifest.entries.map((e) => e.sourceId)).toEqual(['S1', 'S2', 'S3']);
        expect(result.bibliography.map((b) => b.sourceId)).toEqual(['S1', 'S2', 'S3']);
        expect(result.bibliography[0].title).toBe('Title S1');
        expect(result.bibliography[2].title).toBe('Title S3');
    });

    it('renumbers correctly when only mid-manifest is cited and ragSources empty', () => {
        const content = baseContent({
            introduction: 'Just [2].',
        });
        const result = validateCitations(content, manifestOf(3));
        expect(result.content.introduction).toBe('Just [1].');
        expect(result.manifest.entries).toHaveLength(1);
        expect(result.manifest.entries[0].sourceId).toBe('S1');
        expect(result.manifest.entries[0].title).toBe('Title 2');
    });

    it('walks all body points and callToAction', () => {
        const content = baseContent({
            body: [
                { point: 'A', content: 'Cite [1].' },
                { point: 'B', content: 'Cite [2].' },
            ],
            callToAction: 'Final [1] push.',
        });
        const result = validateCitations(content, manifestOf(2));
        expect(result.content.body[0].content).toBe('Cite [1].');
        expect(result.content.body[1].content).toBe('Cite [2].');
        expect(result.content.callToAction).toBe('Final [1] push.');
        expect(result.stats.surfaces).toEqual(expect.arrayContaining(['body', 'callToAction']));
    });

    it('keeps callToAction undefined when input is undefined', () => {
        const content = baseContent({ callToAction: undefined });
        const result = validateCitations(content, manifestOf(1));
        expect(result.content.callToAction).toBeUndefined();
    });

    it('persists the new manifest on the returned content', () => {
        const content = baseContent({ introduction: 'Cite [1].' });
        const result = validateCitations(content, manifestOf(2));
        expect(result.content.citationManifest).toBeDefined();
        expect(result.content.citationManifest!.version).toBe('1');
        expect(result.content.citationManifest!.entries).toHaveLength(1);
    });

    it('handles empty manifest gracefully (all markers dropped)', () => {
        const content = baseContent({
            introduction: 'Cite [1] and [S2].',
            ragSources: [rag('S1')],
        });
        const result = validateCitations(content, { version: '1', entries: [] });
        expect(result.content.introduction).toBe('Cite  and .');
        expect(result.bibliography).toEqual([]);
        expect(result.manifest.entries).toEqual([]);
        expect(result.stats.markersDropped).toBe(2);
    });
});
