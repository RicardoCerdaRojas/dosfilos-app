import { IBibleVersionRepository } from '@/domain/bible/ports/IBibleVersionRepository';
import { BibleReference } from '@/domain/bible/entities/BibleEntities';
import { getBooksByTestament, type BibleBookId, type Testament } from '@dosfilos/domain';
import { WEB_TO_SBL, SBL_TO_WEB } from './originalLanguageBookMap';

interface OriginalLanguageProvider {
    supports(bookId: BibleBookId): boolean;
    getChapterContent(bookId: BibleBookId, chapter: number): Promise<string[]>;
}

/**
 * Shared base for the Greek (SBLGNT NT) and Hebrew (MorphHB OT)
 * "version" repositories that surface in the Bible reader's version
 * picker. Adapts the existing async, CDN-fetched, BibleBookId-typed
 * `IOriginalLanguageBibleProvider` implementations to the sync
 * `IBibleVersionRepository` interface that the rest of the Bible UI
 * already consumes — without forcing a global async refactor.
 *
 * Strategy:
 *  - `getChapterContent()` is sync and returns whatever's in the
 *    in-memory cache (or null if not loaded yet).
 *  - `loadChapter()` is async, fetches via the underlying provider,
 *    caches by `${webCanonicalBookId}-${chapter}`, and returns the
 *    verse-text array. The BibleReader's async path calls this and
 *    populates `chaptersData` from the result.
 *
 * Per-testament gating is honored via `supports(bookId)` on the
 * underlying provider — the BibleReader resolves "no NT books for
 * Hebrew" / "no OT books for Greek" to a graceful empty render +
 * helpful copy.
 */
export abstract class OriginalLanguageRepositoryBase implements IBibleVersionRepository {
    protected abstract provider: OriginalLanguageProvider;
    protected abstract testament: Testament;
    protected abstract versionId: string;
    protected abstract languageCode: string;

    private cache = new Map<string, string[]>();
    private booksCache: { id: string; name: string; chapters: number }[] | null = null;

    getVersionId(): string {
        return this.versionId;
    }

    getLanguage(): string {
        return this.languageCode;
    }

    getBooks(): { id: string; name: string; chapters: number }[] {
        if (this.booksCache) return this.booksCache;
        const books = getBooksByTestament(this.testament);
        this.booksCache = books.map((b) => ({
            id: SBL_TO_WEB[b.id] ?? b.id,
            name: b.nameEs ?? b.nameEn,
            chapters: b.chapterCount,
        }));
        return this.booksCache;
    }

    isValidBook(bookName: string): boolean {
        const normalized = bookName.toLowerCase();
        return this.getBooks().some((b) => b.id.toLowerCase() === normalized);
    }

    getChapterCount(bookNameOrId: string): number {
        const normalized = bookNameOrId.toLowerCase();
        return (
            this.getBooks().find((b) => b.id.toLowerCase() === normalized)?.chapters ?? 0
        );
    }

    resolveBookId(query: string): string | null {
        const normalized = query.toUpperCase();
        return WEB_TO_SBL[normalized] ? normalized : null;
    }

    parseReference(_reference: string): BibleReference | null {
        return null;
    }

    getVerses(_reference: string): string | null {
        return null;
    }

    /**
     * Sync stub — returns cached content if available. The async
     * `loadChapter` must be called first to populate cache. Returns
     * null when not loaded; the BibleReader's async path then awaits
     * `loadChapter` to fill it in.
     */
    getChapterContent(bookNameOrId: string, chapter: number): string[] | null {
        const cacheKey = `${bookNameOrId.toUpperCase()}-${chapter}`;
        return this.cache.get(cacheKey) ?? null;
    }

    getVerseCount(bookNameOrId: string, chapter: number): number {
        return this.getChapterContent(bookNameOrId, chapter)?.length ?? 0;
    }

    search(_query: string, _limit?: number): { reference: string; text: string }[] {
        // Original-language full-text search is out of scope for v1.
        return [];
    }

    /**
     * Async fetch + cache. Idempotent — repeated calls for the same
     * (bookId, chapter) hit the cache after the first load. Returns
     * null when the underlying provider doesn't cover the requested
     * book (e.g. asking the Greek provider for an OT book).
     */
    async loadChapter(webCanonicalBookId: string, chapter: number): Promise<string[] | null> {
        const sblId = WEB_TO_SBL[webCanonicalBookId.toUpperCase()];
        if (!sblId || !this.provider.supports(sblId)) return null;

        const cacheKey = `${webCanonicalBookId.toUpperCase()}-${chapter}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const content = await this.provider.getChapterContent(sblId, chapter);
            this.cache.set(cacheKey, content);
            return content;
        } catch (err) {
            console.error(
                `[${this.versionId}] loadChapter failed for ${webCanonicalBookId} ${chapter}:`,
                err,
            );
            return null;
        }
    }

    /**
     * Whether the secondary reader can render this book at all.
     * The version selector / BibleReader use this to show a friendly
     * "no available" placeholder instead of an empty render when the
     * user picks Greek for an OT book or Hebrew for a NT book.
     */
    supportsBook(webCanonicalBookId: string): boolean {
        const sblId = WEB_TO_SBL[webCanonicalBookId.toUpperCase()];
        return !!sblId && this.provider.supports(sblId);
    }

    /** Used by the BibleReader to pick correct font + RTL direction. */
    isOriginalLanguage(): true {
        return true;
    }
}
