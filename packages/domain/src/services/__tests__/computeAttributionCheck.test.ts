import { describe, it, expect } from 'vitest';
import { computeAttributionCheck } from '../computeAttributionCheck';
import { SBLGNT_SOURCE_ID } from '../aggregateRequiredAttributions';
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

describe('computeAttributionCheck (PR 5)', () => {
    it('is ok with no manifest', () => {
        const report = computeAttributionCheck(undefined);
        expect(report.ok).toBe(true);
        expect(report.requiredAttributions).toEqual([]);
        expect(report.missingAttributions).toEqual([]);
    });

    it('surfaces the required SBLGNT block and stays ok', () => {
        const report = computeAttributionCheck(
            manifest([entry({ resourceId: SBLGNT_SOURCE_ID, title: 'SBLGNT — Juan 1:1' })]),
        );
        expect(report.requiredAttributions.map((b) => b.sourceId)).toEqual([SBLGNT_SOURCE_ID]);
        expect(report.ok).toBe(true);
    });

    it('flags a CC BY source that has no attribution lines as missing', () => {
        const report = computeAttributionCheck(
            manifest([
                entry({
                    resourceId: 'res-cc',
                    title: 'Comentario abierto',
                    license: 'CC BY 4.0',
                }),
            ]),
        );
        expect(report.ok).toBe(false);
        expect(report.missingAttributions).toEqual([
            { sourceId: 'res-cc', title: 'Comentario abierto', license: 'CC BY 4.0' },
        ]);
    });

    it('does not flag a CC BY source that already carries attribution lines', () => {
        const report = computeAttributionCheck(
            manifest([
                entry({
                    resourceId: 'res-cc',
                    title: 'Comentario abierto',
                    license: 'CC BY 4.0',
                    requiredAttribution: ['© 2024 Autor. CC BY 4.0.'],
                }),
            ]),
        );
        expect(report.ok).toBe(true);
        expect(report.requiredAttributions.map((b) => b.sourceId)).toEqual(['res-cc']);
    });

    it('flags a source with an explicit copyright notice but no lines', () => {
        const report = computeAttributionCheck(
            manifest([entry({ resourceId: 'res-c', title: 'Libro', copyright: '© 2020 Editorial' })]),
        );
        expect(report.ok).toBe(false);
        expect(report.missingAttributions[0].sourceId).toBe('res-c');
    });

    it('does not flag public-domain sources', () => {
        const report = computeAttributionCheck(
            manifest([entry({ resourceId: 'res-pd', license: 'Public Domain' })]),
        );
        expect(report.ok).toBe(true);
        expect(report.missingAttributions).toEqual([]);
    });

    it('never flags SBLGNT (covered by the compliance block, not entry lines)', () => {
        const report = computeAttributionCheck(
            manifest([
                entry({ resourceId: SBLGNT_SOURCE_ID, license: 'CC BY 4.0' }),
            ]),
        );
        expect(report.ok).toBe(true);
        expect(report.missingAttributions).toEqual([]);
    });

    it('deduplicates a repeated missing source', () => {
        const report = computeAttributionCheck(
            manifest([
                entry({ sourceId: 'S1', resourceId: 'res-cc', chunkId: 'c-1', license: 'CC BY-SA 4.0' }),
                entry({ sourceId: 'S2', resourceId: 'res-cc', chunkId: 'c-2', license: 'CC BY-SA 4.0' }),
            ]),
        );
        expect(report.missingAttributions).toHaveLength(1);
    });
});
