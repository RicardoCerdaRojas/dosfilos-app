import {
    getBookById,
    type AssistantVerseInput,
    type BibleBookId,
    type IBibleVersionRepository,
    type IOriginalLanguageBibleProvider,
} from '@dosfilos/domain';

/**
 * Loads the verse-by-verse text of a biblical book in the active
 * display language and returns it in the shape the IExpositoryAssistant
 * passes consume.
 *
 * v1.6 behaviour:
 *   1. If an original-language provider is supplied AND it supports
 *      the requested book, fetch from there (Greek SBLGNT for NT,
 *      Hebrew WLC/morphhb for OT). The model sees real participles,
 *      μέν/δέ, waw-consecutive, etc.
 *   2. On any failure (CDN down, parse error, book not in source
 *      corpus), fall back silently to the translation repository
 *      (RVR/ASV). The caller learns about the fallback via the
 *      `source` field on the result and can surface a UI warning.
 *
 * Centralised here so a single bug in the loader doesn't propagate
 * to every pass. The wizard calls this once at setup, holds the
 * verses in component state, and threads them into all 5 pass
 * invocations.
 *
 * Returns a Promise so the wizard's "Iniciar análisis" handler can
 * await the load before launching Pase 1.
 */
export interface LoadBookVersesInput {
    bookId: BibleBookId;
    displayLanguage: 'es' | 'en';
    /**
     * Translation source — used as the fallback when the original
     * provider is unavailable for the requested book or fails to
     * load. Always sync (bundled JSON), so the fallback path has
     * no extra latency.
     */
    bibleRepository: IBibleVersionRepository;
    /**
     * Optional original-language provider. When present and supports
     * the book, takes precedence over the translation. Omit to
     * force translation-only behaviour (legacy v1.5 mode).
     */
    originalLanguageProvider?: IOriginalLanguageBibleProvider;
}

export interface LoadBookVersesResult {
    book: string;
    verses: AssistantVerseInput[];
    /**
     * Where the verses ultimately came from. The wizard surfaces
     * this so the pastor knows whether the analysis is grounded in
     * the original or in the translation surrogate.
     */
    source: 'original-greek' | 'original-hebrew' | 'translation';
    /**
     * Set when the wizard tried to use an original-language provider
     * but had to fall back. Carries the underlying error message so
     * the UI can show a meaningful warning.
     */
    fallbackReason?: string;
}

export async function loadBookVerses(
    input: LoadBookVersesInput,
): Promise<LoadBookVersesResult> {
    const book = getBookById(input.bookId);
    if (!book) {
        throw new Error(`Libro desconocido: ${input.bookId}`);
    }

    const displayName =
        input.displayLanguage === 'en' ? book.nameEn : book.nameEs;

    // Try original-language source first when applicable. The
    // provider's `supports()` is cheap; the actual fetch is async
    // and may throw on network/parse errors — both treated as
    // "fall back to translation" per the v1.6 user decision.
    if (
        input.originalLanguageProvider &&
        input.originalLanguageProvider.supports(input.bookId)
    ) {
        try {
            const verses = await loadFromOriginal(
                book.chapterCount,
                input.bookId,
                input.originalLanguageProvider,
            );
            if (verses.length === 0) {
                throw new Error('Original-language source returned no verses');
            }
            const sourceTag: LoadBookVersesResult['source'] =
                input.originalLanguageProvider.getLanguage() === 'greek'
                    ? 'original-greek'
                    : 'original-hebrew';
            return { book: displayName, verses, source: sourceTag };
        } catch (err) {
            console.warn(
                '[loadBookVerses] original-language load failed, falling back to translation:',
                err,
            );
            const verses = loadFromTranslation(
                book.chapterCount,
                displayName,
                input.bibleRepository,
            );
            if (verses.length === 0) {
                throw new Error(
                    `No se pudo cargar el texto del libro ${input.bookId}. Verifica que la versión bíblica esté disponible.`,
                );
            }
            return {
                book: displayName,
                verses,
                source: 'translation',
                fallbackReason:
                    err instanceof Error ? err.message : String(err),
            };
        }
    }

    // No original-language provider OR it doesn't support this book
    // (e.g. a 'mixed' genre book the user picked). Translation only.
    const verses = loadFromTranslation(
        book.chapterCount,
        displayName,
        input.bibleRepository,
    );
    if (verses.length === 0) {
        throw new Error(
            `No se pudo cargar el texto del libro ${input.bookId}. Verifica que la versión bíblica esté disponible.`,
        );
    }
    return { book: displayName, verses, source: 'translation' };
}

async function loadFromOriginal(
    chapterCount: number,
    bookId: BibleBookId,
    provider: IOriginalLanguageBibleProvider,
): Promise<AssistantVerseInput[]> {
    const out: AssistantVerseInput[] = [];
    for (let chapter = 1; chapter <= chapterCount; chapter++) {
        const lines = await provider.getChapterContent(bookId, chapter);
        lines.forEach((text, idx) => {
            if (typeof text !== 'string' || text.trim().length === 0) return;
            out.push({
                chapter,
                verse: idx + 1,
                text: text.trim(),
            });
        });
    }
    return out;
}

function loadFromTranslation(
    chapterCount: number,
    bookDisplayName: string,
    repo: IBibleVersionRepository,
): AssistantVerseInput[] {
    const out: AssistantVerseInput[] = [];
    for (let chapter = 1; chapter <= chapterCount; chapter++) {
        // Bible repos are keyed by display name, NOT SBL canonical
        // id (see commit 2889c29 post-mortem).
        const lines = repo.getChapterContent(bookDisplayName, chapter);
        if (!lines) continue;
        lines.forEach((text, idx) => {
            if (typeof text !== 'string' || text.trim().length === 0) return;
            out.push({
                chapter,
                verse: idx + 1,
                text: text.trim(),
            });
        });
    }
    return out;
}
