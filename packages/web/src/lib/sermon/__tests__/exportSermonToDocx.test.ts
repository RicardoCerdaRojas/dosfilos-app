import { describe, it, expect } from 'vitest';
import type { Sermon } from '@dosfilos/domain';
import { exportSermonToDocx } from '../exportSermonToDocx';

/**
 * Smoke tests for the sermon .docx exporter. Mirrors the paper test:
 * we don't crack open the OOXML package to assert paragraph shapes —
 * that couples too tightly to the docx library's internals. Instead
 * verify the exporter runs end-to-end on realistic inputs and produces
 * non-empty Blobs across the relevant shapes (manifest, legacy
 * ragSources, neither).
 */
function makeSermon(partial: Partial<Sermon> = {}): Sermon {
    return {
        id: 'sermon-1',
        userId: 'user-1',
        title: 'El Cordero que vence',
        content: [
            '# Introducción',
            '',
            'En **Apocalipsis 5** el vidente ve al Cordero [1].',
            '',
            '## Punto 1',
            '',
            'La debilidad aparente revela la victoria [1, 2].',
            '',
            'Como cita Carson [2], el contraste es deliberado.',
        ].join('\n'),
        bibleReferences: ['Apocalipsis 5:1-14'],
        tags: ['cristología'],
        status: 'published',
        createdAt: new Date('2026-05-01'),
        updatedAt: new Date('2026-05-01'),
        isShared: false,
        authorName: 'Pastor',
        preachingHistory: [],
        ...partial,
    };
}

describe('exportSermonToDocx', () => {
    it('produces a non-empty Blob for a sermon with markers + manifest', async () => {
        const sermon = makeSermon({
            citationManifest: {
                version: '1',
                entries: [
                    {
                        sourceId: 'S1',
                        resourceId: 'r1',
                        chunkId: 'c1',
                        title: 'Beale - Revelation',
                        author: 'G.K. Beale',
                        page: '342',
                        excerpt: 'The Lamb…',
                    },
                    {
                        sourceId: 'S2',
                        resourceId: 'r2',
                        chunkId: 'c2',
                        title: 'Carson - For the Love of God',
                        author: 'D.A. Carson',
                        page: '85',
                        excerpt: 'Cristo cumple…',
                    },
                ],
            },
            bibliography: [
                { sourceId: 'S1', title: 'Beale - Revelation', author: 'G.K. Beale', page: '342', usedFor: 'cristología del Cordero' },
                { sourceId: 'S2', title: 'Carson - For the Love of God', author: 'D.A. Carson', page: '85', usedFor: 'aplicación' },
            ],
        });
        const blob = await exportSermonToDocx(sermon);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBeGreaterThan(2000);
    });

    it('produces a non-empty Blob for a legacy sermon (no manifest, just ragSources)', async () => {
        const sermon = makeSermon({
            bibliography: [
                { title: 'Legacy source', usedFor: 'no manifest path' },
            ],
        });
        const blob = await exportSermonToDocx(sermon);
        expect(blob.size).toBeGreaterThan(1500);
    });

    it('produces a non-empty Blob for a sermon with no library context at all', async () => {
        const sermon = makeSermon({ content: 'Solo prosa, sin citas.' });
        const blob = await exportSermonToDocx(sermon);
        expect(blob.size).toBeGreaterThan(1500);
    });

    it('handles markdown emphasis without throwing', async () => {
        const sermon = makeSermon({
            content: '**Negrita** y *cursiva* y `código` y normal.',
        });
        const blob = await exportSermonToDocx(sermon);
        expect(blob.size).toBeGreaterThan(1500);
    });
});
