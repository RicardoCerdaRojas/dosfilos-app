/**
 * End-to-end Phase B citation pipeline tests.
 *
 * These tests stitch together the two pure domain functions that form
 * the anti-hallucination loop:
 *
 *   1. `buildCitationManifest(chunks)` — turns retrieved RAG chunks
 *      into the closed set of IDs the prompt advertises to the LLM.
 *   2. `validateCitations(content, manifest)` — strips anything the
 *      LLM emits that drifts off the contract.
 *
 * Each test simulates a realistic "what the LLM returned" scenario and
 * asserts the cleaned output is consistent: prose markers, manifest
 * entries, and bibliography stay aligned 1:1. Unit tests for each
 * function live alongside their implementation; this suite exists to
 * catch breakages at the seams where they meet.
 */
import { describe, it, expect } from 'vitest';
import { buildCitationManifest } from '../buildCitationManifest';
import { validateCitations } from '../validateCitations';
import type { DocumentChunkData } from '../../entities/DocumentChunk';
import type { SermonContent } from '../../entities/SermonGenerator';

function chunk(id: string, partial?: Partial<DocumentChunkData>): DocumentChunkData {
    return {
        id,
        resourceId: partial?.resourceId ?? `res-${id}`,
        resourceTitle: partial?.resourceTitle ?? `Title ${id}`,
        resourceAuthor: partial?.resourceAuthor ?? `Author ${id}`,
        userId: 'u',
        chunkIndex: 0,
        text: partial?.text ?? `Excerpt for ${id}.`,
        metadata: partial?.metadata ?? { page: 1 },
        createdAt: new Date(0),
    };
}

function draft(partial: Partial<SermonContent>): SermonContent {
    return {
        title: 'Test',
        introduction: '',
        body: [],
        conclusion: '',
        ragSources: [],
        ...partial,
    };
}

describe('citation pipeline (build → validate)', () => {
    it('happy path: LLM cites every source exactly once', () => {
        const manifest = buildCitationManifest([
            chunk('c1', { resourceTitle: 'Wallace', resourceAuthor: 'Daniel B.' }),
            chunk('c2', { resourceTitle: 'BDAG' }),
            chunk('c3', { resourceTitle: 'Carson' }),
        ]);
        const llmOutput = draft({
            introduction: 'Para Wallace [1] el aoristo denota acción puntual.',
            body: [{ point: 'I', content: 'BDAG [2] confirma.' }],
            conclusion: 'Carson [3] sintetiza.',
            ragSources: [
                { sourceId: 'S1', title: 'Wallace', usedFor: 'aoristo' },
                { sourceId: 'S2', title: 'BDAG', usedFor: 'lexico' },
                { sourceId: 'S3', title: 'Carson', usedFor: 'sintesis' },
            ],
        });

        const result = validateCitations(llmOutput, manifest);

        expect(result.stats.markersDropped).toBe(0);
        expect(result.stats.droppedEntries).toEqual([]);
        expect(result.stats.markersValid).toBe(3);
        expect(result.content.introduction).toContain('[1]');
        expect(result.content.conclusion).toContain('[3]');
        expect(result.bibliography).toHaveLength(3);
        expect(result.manifest.entries.map((e) => e.sourceId)).toEqual(['S1', 'S2', 'S3']);
    });

    it('LLM hallucinates marker IDs not in the manifest — stripped', () => {
        const manifest = buildCitationManifest([chunk('c1'), chunk('c2')]);
        const llmOutput = draft({
            introduction: 'Real [1], fake [99], invented [42].',
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.stats.markersDropped).toBe(2);
        expect(result.stats.markersValid).toBe(1);
        expect(result.content.introduction).toBe('Real [1], fake , invented .');
    });

    it('LLM hallucinates a ragSources entry with an unknown sourceId — dropped', () => {
        const manifest = buildCitationManifest([chunk('c1')]);
        const llmOutput = draft({
            introduction: 'Real [1].',
            ragSources: [
                { sourceId: 'S1', title: 'Real source', usedFor: 'context' },
                { sourceId: 'S99', title: 'Fabricated MacArthur cite', usedFor: 'forged' },
                { title: 'Anonymous user content', usedFor: 'junk' },
            ],
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.stats.droppedEntries).toHaveLength(2);
        expect(result.stats.droppedEntries.map((d) => d.reason).sort()).toEqual(['no-id', 'unknown-id']);
        expect(result.bibliography).toHaveLength(1);
        expect(result.bibliography[0].title).toBe('Real source');
    });

    it('LLM mixes valid + invalid in a multi-cite group — keeps only valid (renumbered contiguously)', () => {
        const manifest = buildCitationManifest([chunk('c1'), chunk('c2'), chunk('c3')]);
        const llmOutput = draft({
            introduction: 'Per [1, 99, 3] the doctrine stands.',
        });
        const result = validateCitations(llmOutput, manifest);
        // Original IDs 1 and 3 survive, but the manifest renumbers 1..M
        // so the user sees a contiguous [1, 2] in the bibliography.
        expect(result.content.introduction).toBe('Per [1, 2] the doctrine stands.');
        expect(result.stats.markersValid).toBe(2);
        expect(result.stats.markersDropped).toBe(1);
        expect(result.manifest.entries).toHaveLength(2);
        expect(result.manifest.entries.map((e) => e.chunkId)).toEqual(['c1', 'c3']);
    });

    it('LLM cites in prose but omits the source from ragSources — bibliography synthesized', () => {
        const manifest = buildCitationManifest([
            chunk('c1', { resourceTitle: 'Wallace', resourceAuthor: 'Daniel B.', metadata: { page: 432 } }),
        ]);
        const llmOutput = draft({
            introduction: 'See [1].',
            ragSources: [], // forgot to echo it back
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.bibliography).toHaveLength(1);
        expect(result.bibliography[0].title).toBe('Wallace');
        expect(result.bibliography[0].usedFor).toBe('Citado en el sermón');
    });

    it('LLM cites only a subset — manifest renumbers survivors 1..M', () => {
        const manifest = buildCitationManifest([chunk('c1'), chunk('c2'), chunk('c3'), chunk('c4'), chunk('c5')]);
        const llmOutput = draft({
            introduction: 'Cite [2] and [4].',
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.content.introduction).toBe('Cite [1] and [2].');
        expect(result.manifest.entries).toHaveLength(2);
        expect(result.manifest.entries.map((e) => e.title)).toEqual(['Title c2', 'Title c4']);
    });

    it('LLM cites zero sources — manifest empties, no bibliography', () => {
        const manifest = buildCitationManifest([chunk('c1'), chunk('c2')]);
        const llmOutput = draft({
            introduction: 'Plain prose with no citations.',
            ragSources: [],
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.manifest.entries).toEqual([]);
        expect(result.bibliography).toEqual([]);
        expect(result.stats.markersDropped).toBe(0);
    });

    it('Bible reference markdown links survive the validator untouched', () => {
        const manifest = buildCitationManifest([chunk('c1')]);
        const llmOutput = draft({
            introduction: 'Como dice [📖 Juan 1:1](#bible-juan-1-1), apoyado por [1].',
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.content.introduction).toContain('[📖 Juan 1:1](#bible-juan-1-1)');
        expect(result.content.introduction).toContain('[1]');
    });

    it('LLM uses [Sn] syntax — normalized to bare ordinals on output', () => {
        const manifest = buildCitationManifest([chunk('c1'), chunk('c2')]);
        const llmOutput = draft({
            introduction: 'Wallace [S1] and BDAG [S2].',
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.content.introduction).toBe('Wallace [1] and BDAG [2].');
        expect(result.stats.markersValid).toBe(2);
    });

    it('citations span all four surfaces — stats record each', () => {
        const manifest = buildCitationManifest([chunk('c1')]);
        const llmOutput = draft({
            introduction: 'Intro [1].',
            body: [{ point: 'I', content: 'Body [1].' }],
            conclusion: 'Conc [1].',
            callToAction: 'Action [1].',
        });
        const result = validateCitations(llmOutput, manifest);
        expect(result.stats.surfaces.sort()).toEqual(['body', 'callToAction', 'conclusion', 'introduction']);
    });
});
