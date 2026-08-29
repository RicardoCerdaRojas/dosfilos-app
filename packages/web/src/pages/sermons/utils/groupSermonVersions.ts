import type { SermonEntity } from '@dosfilos/domain';

export interface SermonVersionGroup {
    /** The root (original) sermon — rendered as the primary card/row. */
    root: SermonEntity;
    /** Versions of the root, oldest → newest. Index 0 is "v2", index 1 "v3", … */
    versions: SermonEntity[];
}

/**
 * Identidad de respaldo, para los pares que no tienen NINGÚN enlace.
 *
 * Con `versionOf` y `sourceSermonId` ya cubiertos, esto queda para el
 * historial más viejo: sermones publicados antes de que existiera cualquiera
 * de los dos campos. Serie + título + pasajes alcanza para reconocerlos —
 * dos sermones DISTINTOS no comparten las tres cosas, y el test lo fija con
 * dos "El Verbo es Dios" sobre pasajes distintos, que siguen siendo dos.
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
        // DOS CAMPOS ENLAZAN, NO UNO. `versionOf` lo pone "crear versión";
        // `sourceSermonId` lo pone PUBLICAR, que crea una copia publicada
        // apuntando a su borrador. Esta función sólo miraba el primero, así que
        // el par borrador+publicado —que es el caso más común de todos— se
        // mostraba como dos sermones distintos. El dato siempre estuvo bien: se
        // leía el campo equivocado. El tablero de inicio ya deduplicaba por
        // `sourceSermonId`; la lista no.
        const parent = sermon.versionOf ?? sermon.sourceSermonId;
        if (parent && ids.has(parent)) {
            const arr = versionsByRoot.get(parent) ?? [];
            arr.push(sermon);
            versionsByRoot.set(parent, arr);
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
