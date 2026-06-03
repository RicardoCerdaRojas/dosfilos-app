import { describe, it, expect } from 'vitest';
import {
    aggregateRequiredAttributions,
    hasMorphologyRendered,
    MORPHGNT_SOURCE_ID,
    SBLGNT_SOURCE_ID,
} from '../aggregateRequiredAttributions';
import type { CitationManifest, CitationManifestEntry } from '../../entities/SermonGenerator';

function entry(overrides: Partial<CitationManifestEntry>): CitationManifestEntry {
    return {
        sourceId: 'S1',
        resourceId: 'res-1',
        chunkId: 'c-1',
        title: 'Recurso',
        excerpt: '…',
        ...overrides,
    };
}

function manifest(entries: CitationManifestEntry[]): CitationManifest {
    return { version: '1', entries };
}

describe('aggregateRequiredAttributions — SBLGNT two-block split (PR 5)', () => {
    it('returns no blocks for an empty or absent manifest', () => {
        expect(aggregateRequiredAttributions(undefined)).toEqual([]);
        expect(aggregateRequiredAttributions(manifest([]))).toEqual([]);
    });

    it('renders ONLY the CC BY 4.0 base-text block when SBLGNT carries surface text', () => {
        const blocks = aggregateRequiredAttributions(
            manifest([entry({ resourceId: SBLGNT_SOURCE_ID, title: 'SBLGNT — Juan 1:1' })]),
        );
        expect(blocks.map((b) => b.sourceId)).toEqual([SBLGNT_SOURCE_ID]);
        expect(blocks[0].lines.join(' ')).toContain('CC BY 4.0');
        expect(blocks[0].lines.join(' ')).not.toContain('ShareAlike');
    });

    it('appends the CC BY-SA 4.0 MorphGNT block when morphology is rendered', () => {
        const blocks = aggregateRequiredAttributions(
            manifest([
                entry({ resourceId: SBLGNT_SOURCE_ID, morphologyRendered: true }),
            ]),
        );
        expect(blocks.map((b) => b.sourceId)).toEqual([SBLGNT_SOURCE_ID, MORPHGNT_SOURCE_ID]);
        const morph = blocks[1].lines.join(' ');
        expect(morph).toContain('CC BY-SA 4.0');
        expect(morph).toContain('ShareAlike');
    });

    it('deduplicates SBLGNT across many cited Greek words into a single block pair', () => {
        const blocks = aggregateRequiredAttributions(
            manifest([
                entry({ sourceId: 'S1', resourceId: SBLGNT_SOURCE_ID, chunkId: 'c-1', morphologyRendered: true }),
                entry({ sourceId: 'S2', resourceId: SBLGNT_SOURCE_ID, chunkId: 'c-2' }),
            ]),
        );
        expect(blocks.map((b) => b.sourceId)).toEqual([SBLGNT_SOURCE_ID, MORPHGNT_SOURCE_ID]);
    });

    it('emits per-source blocks from requiredAttribution lines, after SBLGNT', () => {
        const blocks = aggregateRequiredAttributions(
            manifest([
                entry({ sourceId: 'S1', resourceId: SBLGNT_SOURCE_ID }),
                entry({
                    sourceId: 'S2',
                    resourceId: 'res-cc',
                    title: 'Comentario CC BY',
                    requiredAttribution: ['© 2024 Autor. CC BY 4.0.'],
                }),
            ]),
        );
        expect(blocks.map((b) => b.sourceId)).toEqual([SBLGNT_SOURCE_ID, 'res-cc']);
        expect(blocks[1].lines).toEqual(['© 2024 Autor. CC BY 4.0.']);
    });
});

describe('hasMorphologyRendered', () => {
    it('is false when no SBLGNT entry flags morphology', () => {
        expect(hasMorphologyRendered(undefined)).toBe(false);
        expect(hasMorphologyRendered(manifest([entry({ resourceId: SBLGNT_SOURCE_ID })]))).toBe(false);
    });

    it('is true only when an SBLGNT entry flags morphology', () => {
        expect(
            hasMorphologyRendered(
                manifest([entry({ resourceId: SBLGNT_SOURCE_ID, morphologyRendered: true })]),
            ),
        ).toBe(true);
        // A non-SBLGNT entry flagging morphology does not trigger the block.
        expect(
            hasMorphologyRendered(
                manifest([entry({ resourceId: 'res-other', morphologyRendered: true })]),
            ),
        ).toBe(false);
    });
});
