import type { SermonEntity } from '@dosfilos/domain';

export interface SermonVersionGroup {
    /** The root (original) sermon — rendered as the primary card/row. */
    root: SermonEntity;
    /** Versions of the root, oldest → newest. Index 0 is "v2", index 1 "v3", … */
    versions: SermonEntity[];
}

/**
 * Identidad de respaldo para publicaciones ANTERIORES a la cadena de versiones.
 *
 * Publicar creaba un documento nuevo sin `versionOf`, así que el borrador y su
 * publicación quedaban como dos sermones sueltos: en la lista se veían dos
 * veces "Firme en la Verdad", mismo plan, mismo pasaje, mismo día, y sin el
 * distintivo de versiones. No es una hipótesis — está en cualquier cuenta con
 * historial anterior a esa función.
 *
 * Serie + título + pasajes alcanza para reconocerlos: dos sermones DISTINTOS
 * no comparten las tres cosas. Es la misma identidad que ya usa la app de la
 * tablet para no ofrecer el mismo sermón dos veces en el atril; acá se
 * agrupan en vez de descartarse, porque en la web el historial es el punto.
 */
const fallbackIdentity = (sermon: SermonEntity): string =>
    [
        sermon.seriesId ?? '',
        sermon.title.trim().toLowerCase(),
        (sermon.bibleReferences ?? []).join(','),
    ].join('|');

/**
 * Folds a flat sermon list into version groups for the dashboard. A sermon is a
 * VERSION when its `versionOf` points at a root that is present in the same
 * list; those nest under the root. If the root was filtered out (different
 * status filter, archived, etc.) the orphan version is promoted to its own root
 * so it never silently disappears. Root ordering is preserved from the input
 * (already sorted by the caller), and each version array is sorted by
 * `createdAt` ascending so the computed "vN" ordinal is stable.
 *
 * Roots that share the fallback identity are then folded together, which is
 * what removes the pre-`versionOf` duplicates from the list.
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

    const explicit = roots.map((root) => ({
        root,
        versions: (versionsByRoot.get(root.id) ?? []).slice().sort(byCreatedAsc),
    }));

    // Segunda pasada: los que no se enlazaron por `versionOf` pero SON el mismo
    // sermón. El primero que llega manda —la lista ya viene ordenada por el
    // llamador— y el resto entra como versión suya.
    const byIdentity = new Map<string, SermonVersionGroup>();
    const folded: SermonVersionGroup[] = [];

    for (const group of explicit) {
        const key = fallbackIdentity(group.root);
        const existing = byIdentity.get(key);
        if (!existing) {
            byIdentity.set(key, group);
            folded.push(group);
            continue;
        }
        existing.versions = [...existing.versions, group.root, ...group.versions].sort(
            byCreatedAsc,
        );
    }

    return folded;
}
