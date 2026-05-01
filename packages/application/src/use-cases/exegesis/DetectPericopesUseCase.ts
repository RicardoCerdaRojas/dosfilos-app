import {
    getBookById,
    type BibleBookId,
    type IBibleVersionRepository,
    type IPericopeDetector,
    type PericopeDetectionOutput,
    type PericopeVerseInput,
} from '@dosfilos/domain';

/**
 * Loads the verse-by-verse text of a biblical book and feeds it to the
 * `IPericopeDetector`. Lives in application so the wizard never has to
 * touch a Bible repository directly.
 *
 * v1 limitation (intentional): the text the detector sees is the
 * *translation* (RVR1960 in Spanish, ASV in English) — we do not yet
 * have SBLGNT/WLC data wired. The detector still runs against the
 * translation; most syntactic markers carry over (μέν/δέ becomes
 * "by one hand / on the other", participial chains become subordinate
 * clauses) so the assistant produces sensible pericopes. The
 * `originalLanguage` field is populated from the book's testament so
 * the detector's prompt nudges it toward the right reasoning style;
 * v1.5 will swap the input source to true original-language text
 * without the wizard or detector needing to change.
 */
export interface DetectPericopesInput {
    bookId: BibleBookId;
    /** Drives both the bible source (RVR vs ASV) and the prompt copy. */
    displayLanguage: 'es' | 'en';
    /** Optional soft constraint — bias the LLM toward N pericopes. */
    targetPericopeCount?: number;
}

export class DetectPericopesUseCase {
    constructor(
        private bibleRepository: IBibleVersionRepository,
        private detector: IPericopeDetector,
    ) {}

    async execute(input: DetectPericopesInput): Promise<PericopeDetectionOutput> {
        const book = getBookById(input.bookId);
        if (!book) {
            throw new Error(`Libro desconocido: ${input.bookId}`);
        }

        const verses: PericopeVerseInput[] = [];
        for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
            const lines = this.bibleRepository.getChapterContent(input.bookId, chapter);
            if (!lines) continue;
            lines.forEach((text, idx) => {
                if (typeof text !== 'string' || text.trim().length === 0) return;
                verses.push({
                    chapter,
                    verse: idx + 1,
                    text: text.trim(),
                });
            });
        }

        if (verses.length === 0) {
            throw new Error(
                `No se pudo cargar el texto del libro ${input.bookId}. Verifica que la versión bíblica esté disponible.`,
            );
        }

        return this.detector.detect({
            book: input.displayLanguage === 'es' ? book.nameEs : book.nameEn,
            originalText: verses,
            // Surrogate hint while v1 feeds translations into the detector;
            // see the class docstring. Aligned with the book's testament so
            // the detector reasons in the right syntactic register.
            originalLanguage: book.testament === 'NT' ? 'greek' : 'hebrew',
            displayLanguage: input.displayLanguage,
            targetPericopeCount: input.targetPericopeCount,
        });
    }
}
