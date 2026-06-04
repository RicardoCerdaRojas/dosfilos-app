import { describe, it, expect } from 'vitest';
import { selectSermonCitationChunks, type RetrievedCitationChunk } from '../selectSermonCitationChunks';

function chunk(over: Partial<RetrievedCitationChunk> & { id: string }): RetrievedCitationChunk {
    return {
        resourceId: `res-${over.id}`,
        resourceTitle: `Book ${over.id}`,
        text: `text ${over.id}`,
        score: 0.5,
        ...over,
    };
}

describe('selectSermonCitationChunks (ADR-031)', () => {
    it('ranks every personal chunk ahead of CORE, regardless of raw score', () => {
        const personal = [chunk({ id: 'p1', score: 0.3 })];
        const core = [chunk({ id: 'c1', score: 0.99 })];
        const out = selectSermonCitationChunks(personal, core);
        expect(out.map((c) => c.id)).toEqual(['p1', 'c1']);
    });

    it('falls back to CORE when the personal library is empty', () => {
        const out = selectSermonCitationChunks([], [chunk({ id: 'c1' }), chunk({ id: 'c2' })]);
        expect(out.map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('uses CORE to fill remaining slots after personal hits', () => {
        const personal = [chunk({ id: 'p1', score: 0.8 })];
        const core = [chunk({ id: 'c1', score: 0.9 }), chunk({ id: 'c2', score: 0.7 })];
        const out = selectSermonCitationChunks(personal, core, { maxChunks: 3 });
        expect(out.map((c) => c.id)).toEqual(['p1', 'c1', 'c2']);
    });

    it('sorts within each scope by score descending', () => {
        const personal = [chunk({ id: 'p1', score: 0.4 }), chunk({ id: 'p2', score: 0.9 })];
        const out = selectSermonCitationChunks(personal, []);
        expect(out.map((c) => c.id)).toEqual(['p2', 'p1']);
    });

    it('caps at maxChunks', () => {
        const personal = Array.from({ length: 15 }, (_, i) => chunk({ id: `p${i}`, score: 1 - i * 0.01 }));
        const out = selectSermonCitationChunks(personal, [], { maxChunks: 10 });
        expect(out).toHaveLength(10);
    });

    it('dedupes the same passage arriving from both scopes (resourceId+page)', () => {
        const personal = [chunk({ id: 'p1', resourceId: 'shared', metadata: { page: '12' } })];
        const core = [chunk({ id: 'c1', resourceId: 'shared', metadata: { page: '12' } })];
        const out = selectSermonCitationChunks(personal, core);
        expect(out.map((c) => c.id)).toEqual(['p1']);
    });

    it('drops chunks below minScore', () => {
        const out = selectSermonCitationChunks(
            [chunk({ id: 'p1', score: 0.2 }), chunk({ id: 'p2', score: 0.8 })],
            [],
            { minScore: 0.5 },
        );
        expect(out.map((c) => c.id)).toEqual(['p2']);
    });

    it('returns empty when there are no real chunks (never invents)', () => {
        expect(selectSermonCitationChunks([], [])).toEqual([]);
    });
});
