import { BibleReference } from '../entities/BibleEntities';

/**
 * Port (Interface) for Bible version repository access
 */
export interface IBibleVersionRepository {
    getVersionId(): string;
    getLanguage(): string;
    parseReference(reference: string): BibleReference | null;
    getVerses(reference: string): string | null;
    isValidBook(bookName: string): boolean;
    /**
     * Id real del libro a partir de un id o de un nombre.
     *
     * Está en el puerto porque quien consume necesita lo mismo que el
     * repositorio: los nombres de libro de una referencia escrita ("Jonás") y
     * los ids del juego de datos (`jn`) no coinciden, y adivinar la traducción
     * afuera es cómo terminamos mostrando Juan bajo el título "Jonás".
     */
    resolveBookId(bookNameOrId: string): string;
    getBooks(): { id: string; name: string; chapters: number }[];
    getChapterCount(bookNameOrId: string): number;
    getChapterContent(bookNameOrId: string, chapter: number): string[] | null;
    search(query: string, limit?: number): { reference: string; text: string }[];
}
