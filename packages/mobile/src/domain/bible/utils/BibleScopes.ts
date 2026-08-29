import { getCanonicalId, BOOK_METADATA } from './BibleMetadata';

/**
 * Dónde buscar.
 *
 * Buscar en los 66 libros sirve para encontrar una frase que se recuerda a
 * medias. No sirve para trabajar: quien prepara sobre Jonás y busca "Nínive"
 * no quiere los ecos en Nahúm, y quien estudia a Pablo no quiere los
 * Evangelios de por medio. El ámbito es lo que convierte la búsqueda en una
 * herramienta de estudio.
 */
export type SearchScope =
    | { kind: 'all' }
    | { kind: 'testament'; value: 'Old' | 'New' }
    | { kind: 'book'; bookId: string }
    | { kind: 'author'; value: AuthorKey };

export const AUTHOR_KEYS = ['moses', 'solomon', 'luke', 'paul', 'peter', 'john'] as const;
export type AuthorKey = (typeof AUTHOR_KEYS)[number];

/**
 * Libros por autor, en ids canónicos.
 *
 * ES ATRIBUCIÓN TRADICIONAL, y la interfaz lo dice. La autoría de varios de
 * estos libros se discute —el Pentateuco, Eclesiastés, 2 Pedro— y Hebreos
 * queda AFUERA a propósito: la tradición lo asoció a Pablo durante siglos y
 * hoy nadie sostiene esa atribución, así que meterlo en el grupo "Pablo" sería
 * afirmar en la interfaz algo que el pastor no afirmaría en el púlpito.
 *
 * Los Salmos tampoco forman un grupo "David": son de muchas manos y ofrecerlos
 * como suyos sería falso de un modo que el propio libro desmiente en sus
 * encabezados.
 */
export const AUTHOR_BOOKS: Record<AuthorKey, string[]> = {
    moses: ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'],
    solomon: ['PRO', 'ECC', 'SON'],
    luke: ['LUK', 'ACT'],
    paul: [
        'ROM',
        '1CO',
        '2CO',
        'GAL',
        'EPH',
        'PHI',
        'COL',
        '1TH',
        '2TH',
        '1TI',
        '2TI',
        'TIT',
        'PHM',
    ],
    peter: ['1PE', '2PE'],
    john: ['JOH', '1JO', '2JO', '3JO', 'REV'],
};

/**
 * Los ids —del juego de datos— que abarca un ámbito. `null` es "todo".
 *
 * La traducción vive acá porque los ids del dato (`jn` para Jonás) no son los
 * canónicos (`JON`), y resolverlo en cada llamada es cómo se termina buscando
 * en el libro equivocado.
 */
export function bookIdsForScope(
    scope: SearchScope,
    books: { id: string }[],
    versionId: string,
): string[] | null {
    if (scope.kind === 'all') return null;
    if (scope.kind === 'book') return [scope.bookId];

    const wanted = new Set(
        scope.kind === 'author'
            ? AUTHOR_BOOKS[scope.value]
            : Object.values(BOOK_METADATA)
                  .filter((meta) => meta.testament === scope.value)
                  .map((meta) => meta.id),
    );

    return books.map((b) => b.id).filter((id) => wanted.has(getCanonicalId(id, versionId)));
}
