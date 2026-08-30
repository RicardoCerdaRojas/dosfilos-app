import {
    chunkRangesForSheets,
    computeExtractionFingerprint,
    formatPassageReference,
    normalizeSheetRanges,
    type ExcerptRecipe,
    type IDocumentChunkReader,
    type IExegeticalPaperRepository,
    type PageIndexEntry,
    type ProjectSource,
    type ProjectSourceExcerpt,
    type SheetRange,
    type SourceType,
} from '@dosfilos/domain';

/**
 * Materializa la elección del selector de páginas.
 *
 * El usuario eligió hojas; el prompt consume fragmentos. Este caso de uso hace
 * la traducción y guarda las DOS cosas: los `excerpts`, que son lo que se le
 * manda al modelo, y la `excerptRecipe`, que es lo que el usuario pidió.
 *
 * Guardar la receta es lo que permite reabrir el selector con la selección
 * intacta, distinguir lo que propuso el sistema de lo que agregó el usuario, y
 * avisar que la selección quedó vieja cuando cambia el pasaje del trabajo —en
 * vez de servir fragmentos de otro pasaje en silencio.
 *
 * Reusa una fuente existente cuando el documento ya está adjunto al trabajo, en
 * vez de crear una segunda. Sin eso, re-elegir páginas dejaría el mismo libro
 * dos veces en el corpus, que es exactamente lo que pasa hoy con la extracción
 * de fragmentos cuando la fuente no guarda el backref a la biblioteca.
 */

export interface SelectSourcePagesInput {
    ownerId: string;
    paperId: string;
    /** Recurso de biblioteca del que se eligieron las hojas. */
    libraryResourceId: string;
    displayLabel: string;
    sourceType: SourceType;
    citationKey?: string | null;
    /** Lo que quedó en el carrito. */
    sheetRanges: ReadonlyArray<SheetRange>;
    /** Lo que el sistema había propuesto, aceptado o no. */
    proposedRanges: ReadonlyArray<SheetRange>;
    /** Índice de hojas del documento, ya cargado por la interfaz. */
    pageIndex: ReadonlyArray<PageIndexEntry>;
}

export interface SelectSourcePagesResult {
    sourceId: string;
    excerptCount: number;
    /** Hojas pedidas que no produjeron ni un fragmento. */
    emptySheets: number;
}

export class SelectSourcePagesUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private chunkReader: IDocumentChunkReader,
    ) { }

    async execute(input: SelectSourcePagesInput): Promise<SelectSourcePagesResult> {
        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const sheetRanges = normalizeSheetRanges(input.sheetRanges);
        if (sheetRanges.length === 0) {
            throw new Error('La selección no tiene ninguna hoja');
        }

        const chunkRanges = chunkRangesForSheets(input.pageIndex, sheetRanges);
        const chunks = chunkRanges.length > 0
            ? await this.chunkReader.readChunks(input.libraryResourceId, chunkRanges)
            : [];

        const excerpts = chunks
            .slice()
            .sort((a, b) => a.chunkIndex - b.chunkIndex)
            .map(toExcerpt);

        const passageRef = formatPassageReference(paper.passage, paper.displayLanguage);
        const recipe: ExcerptRecipe = {
            sheetRanges,
            proposedRanges: normalizeSheetRanges(input.proposedRanges),
            passageFingerprint: computeExtractionFingerprint(passageRef, paper.assignmentBrief),
        };

        const existing = findExistingSource(paper.sources, input.libraryResourceId);
        const extractedAt = new Date();

        if (existing) {
            await this.paperRepository.updateSource(input.ownerId, input.paperId, existing.id, {
                sourceType: input.sourceType,
                displayLabel: input.displayLabel,
                ...(input.citationKey !== undefined ? { citationKey: input.citationKey } : {}),
                excerpts,
                excerptSelectionMode: 'manual',
                excerptRecipe: recipe,
                extractedAt,
                extractionFingerprint: recipe.passageFingerprint,
            });
            return {
                sourceId: existing.id,
                excerptCount: excerpts.length,
                emptySheets: countEmptySheets(input.pageIndex, sheetRanges),
            };
        }

        const created = await this.paperRepository.addSource(input.ownerId, input.paperId, {
            corpusId: input.libraryResourceId,
            sourceType: input.sourceType,
            displayLabel: input.displayLabel,
            citationKey: input.citationKey ?? null,
            order: paper.sources.length,
            mode: 'extracted-excerpts',
            excerpts,
            excerptSelectionMode: 'manual',
            excerptRecipe: recipe,
            sourceLibraryResourceId: input.libraryResourceId,
            extractedAt,
            extractionFingerprint: recipe.passageFingerprint,
        });

        return {
            sourceId: created.id,
            excerptCount: excerpts.length,
            emptySheets: countEmptySheets(input.pageIndex, sheetRanges),
        };
    }
}

/**
 * Busca el documento entre las fuentes del trabajo.
 *
 * Mira el backref a la biblioteca Y el `corpusId`: las fuentes adjuntadas por
 * la ruta vieja —«agregar desde mi biblioteca»— guardan el id en `corpusId` y
 * dejan el backref en null. Mirar solo el backref las daría por inexistentes y
 * duplicaría el libro.
 */
function findExistingSource(
    sources: ReadonlyArray<ProjectSource>,
    libraryResourceId: string,
): ProjectSource | null {
    return sources.find(
        s => s.sourceLibraryResourceId === libraryResourceId || s.corpusId === libraryResourceId,
    ) ?? null;
}

/**
 * El ancla de citación sigue la convención del resto del corpus (`p. N, § S`)
 * para que el prompt y la interfaz no tengan que distinguir de dónde salió cada
 * fragmento.
 *
 * `relevanceScore` va en 1: el usuario eligió estas hojas a mano, no hay
 * puntaje de cercanía que reportar, y dejarlo en 0 haría que la interfaz
 * ordenara al final justo lo que se eligió con más intención.
 */
function toExcerpt(chunk: { text: string; page: number | null; section: string | null }): ProjectSourceExcerpt {
    const { page, section } = chunk;
    let sourceLocation = '';
    if (page && section) sourceLocation = `p. ${page}, § ${section}`;
    else if (page) sourceLocation = `p. ${page}`;
    else if (section) sourceLocation = `§ ${section}`;

    return {
        text: chunk.text,
        sourceLocation,
        relevanceScore: 1,
        userEdited: false,
        editedAt: null,
    };
}

/**
 * Hojas elegidas que no aportan texto. Un documento puede saltear números
 * cuando una página no produjo fragmentos —en blanco, ilegible—, y decirlo es
 * mejor que dejar al usuario creyendo que se llevó doce hojas cuando nueve
 * traían contenido.
 */
function countEmptySheets(
    pageIndex: ReadonlyArray<PageIndexEntry>,
    ranges: ReadonlyArray<SheetRange>,
): number {
    const present = new Set(pageIndex.map(p => p.sheet));
    let empty = 0;
    for (const range of ranges) {
        for (let sheet = range.start; sheet <= range.end; sheet++) {
            if (!present.has(sheet)) empty++;
        }
    }
    return empty;
}
