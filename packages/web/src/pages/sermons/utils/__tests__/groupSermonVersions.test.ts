import { describe, it, expect } from 'vitest';
import { SermonEntity } from '@dosfilos/domain';
import { groupSermonVersions } from '../groupSermonVersions';

const make = (id: string, opts: { versionOf?: string; createdAt?: Date } = {}) =>
    SermonEntity.createSummary({
        id,
        userId: 'u',
        title: `Sermón ${id}`,
        status: 'published',
        createdAt: opts.createdAt ?? new Date('2026-01-01T00:00:00Z'),
        versionOf: opts.versionOf,
    });

describe('groupSermonVersions', () => {
    it('nests versions under their root and preserves root order', () => {
        const root1 = make('r1');
        const root2 = make('r2');
        const v = make('v1', { versionOf: 'r1' });

        const groups = groupSermonVersions([root1, root2, v]);

        expect(groups.map((g) => g.root.id)).toEqual(['r1', 'r2']);
        expect(groups[0]!.versions.map((s) => s.id)).toEqual(['v1']);
        expect(groups[1]!.versions).toEqual([]);
    });

    it('sorts versions oldest → newest so the vN ordinal is stable', () => {
        const root = make('r1');
        const newer = make('vNew', { versionOf: 'r1', createdAt: new Date('2026-03-01T00:00:00Z') });
        const older = make('vOld', { versionOf: 'r1', createdAt: new Date('2026-02-01T00:00:00Z') });

        const [group] = groupSermonVersions([root, newer, older]);

        expect(group!.versions.map((s) => s.id)).toEqual(['vOld', 'vNew']);
    });

    it('promotes an orphan version (root absent) to its own root', () => {
        const orphan = make('v1', { versionOf: 'missing-root' });

        const groups = groupSermonVersions([orphan]);

        expect(groups).toHaveLength(1);
        expect(groups[0]!.root.id).toBe('v1');
        expect(groups[0]!.versions).toEqual([]);
    });
});
