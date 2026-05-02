import {
    getBookById,
    type AssistantVerseInput,
    type BibleBookId,
    type IBibleVersionRepository,
} from '@dosfilos/domain';

/**
 * Loads the verse-by-verse text of a biblical book in the active
 * display language and returns it in the shape the IExpositoryAssistant
 * passes consume.
 *
 * Centralized here (instead of inlined per use case) because all 5
 * passes need the same input and the wizard is expected to load it
 * once at setup, then pass it to each pass use case. A single bug
 * in this loader (like the SBL-id mismatch fix in commit 2889c29)
 * would otherwise propagate to every pass.
 *
 * v1.5 limitation, same as the legacy `DetectPericopesUseCase`:
 * feeds the *translation* (RVR1960 in Spanish, ASV in English) into
 * the assistant. v1.6 will swap to true SBLGNT/WLC original-language
 * sources without changing this signature.
 */
export interface LoadBookVersesInput {
    bookId: BibleBookId;
    displayLanguage: 'es' | 'en';
    bibleRepository: IBibleVersionRepository;
}

export interface LoadBookVersesResult {
    book: string;
    verses: AssistantVerseInput[];
}

export function loadBookVerses(input: LoadBookVersesInput): LoadBookVersesResult {
    const book = getBookById(input.bookId);
    if (!book) {
        throw new Error(`Libro desconocido: ${input.bookId}`);
    }

    // Bible repos are keyed by display name, NOT by SBL canonical id.
    // See commit 2889c29 for the post-mortem of the original mismatch.
    const repoLookupName = input.displayLanguage === 'en' ? book.nameEn : book.nameEs;

    const verses: AssistantVerseInput[] = [];
    for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
        const lines = input.bibleRepository.getChapterContent(repoLookupName, chapter);
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

    return {
        book: input.displayLanguage === 'en' ? book.nameEn : book.nameEs,
        verses,
    };
}
