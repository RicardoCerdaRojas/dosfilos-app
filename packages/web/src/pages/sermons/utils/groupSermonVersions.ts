import type { SermonEntity } from '@dosfilos/domain';

export interface SermonVersionGroup {
    /** The root (original) sermon — rendered as the primary card/row. */
    root: SermonEntity;
    /** Versions of the root, oldest → newest. Index 0 is "v2", index 1 "v3", … */
    versions: SermonEntity[];
}

/**
 * Folds a flat sermon list into version groups for the dashboard. A sermon is a
 * VERSION when its `versionOf` points at a root that is present in the same
 * list; those nest under the root. If the root was filtered out (different
 * status filter, archived, etc.) the orphan version is promoted to its own root
 * so it never silently disappears. Root ordering is preserved from the input
 * (already sorted by the caller), and each version array is sorted by
 * `createdAt` ascending so the computed "vN" ordinal is stable.
 */
export function groupSermonVersions(sermons: SermonEntity[]): SermonVersionGroup[] {
    const ids = new Set(sermons.map((s) => s.id));
    const versionsByRoot = new Map<string, SermonEntity[]>();
    const roots: SermonEntity[] = [];

    for (const sermon of sermons) {
        if (sermon.versionOf && ids.has(sermon.versionOf)) {
            const arr = versionsByRoot.get(sermon.versionOf) ?? [];
            arr.push(sermon);
            versionsByRoot.set(sermon.versionOf, arr);
        } else {
            roots.push(sermon);
        }
    }

    const byCreatedAsc = (a: SermonEntity, b: SermonEntity) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    return roots.map((root) => ({
        root,
        versions: (versionsByRoot.get(root.id) ?? []).slice().sort(byCreatedAsc),
    }));
}
