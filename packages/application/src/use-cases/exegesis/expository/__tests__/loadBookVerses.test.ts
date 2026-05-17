import { describe, it, expect } from 'vitest';
import { loadBookVerses } from '../loadBookVerses';
import type { IBibleVersionRepository } from '@dosfilos/domain';

/**
 * In-memory bible repo fixture. Returns hard-coded chapter content so
 * we can verify the scope filter without touching real bible JSON.
 *
 * Layout: each chapter has 10 verses with text `"<book> <ch>:<v>"`.
 */
function makeRepo(chapterCount: number, bookName: string): IBibleVersionRepository {
    return {
        getChapterContent: (book: string, chapter: number) => {
            if (book !== bookName) return null;
            if (chapter < 1 || chapter > chapterCount) return null;
            return Array.from({ length: 10 }, (_, i) => `${book} ${chapter}:${i + 1}`);
        },
        // Padding for interface — never called by loadBookVerses.
        getBooks: () => [{ id: bookName, name: bookName }],
    } as IBibleVersionRepository;
}

describe('loadBookVerses — scope filter', () => {
    it('loads the whole book when scope is omitted (back-compat)', async () => {
        // Filemón: 1 chapter × 10 verses.
        const repo = makeRepo(1, 'Filemón');
        const r = await loadBookVerses({
            bookId: 'PHM',
            displayLanguage: 'es',
            bibleRepository: repo,
        });
        expect(r.verses.length).toBe(10);
        expect(r.verses[0]).toEqual({ chapter: 1, verse: 1, text: 'Filemón 1:1' });
    });

    it('filters to a single chapter when scope = "Mateo 10"', async () => {
        // Use Mateo metadata — chapter count from canon = 28. The repo
        // fixture only needs to serve chapter 10 because the loader
        // skips out-of-range chapters at fetch time.
        const repo = makeRepo(28, 'Mateo');
        const r = await loadBookVerses({
            bookId: 'MAT',
            displayLanguage: 'es',
            bibleRepository: repo,
            scope: {
                bookId: 'MAT',
                chapterStart: 10,
                chapterEnd: 10,
                verseStart: null,
                verseEnd: null,
            },
        });
        expect(r.verses.length).toBe(10);
        expect(r.verses.every((v) => v.chapter === 10)).toBe(true);
    });

    it('filters to a chapter range "Mateo 5-7"', async () => {
        const repo = makeRepo(28, 'Mateo');
        const r = await loadBookVerses({
            bookId: 'MAT',
            displayLanguage: 'es',
            bibleRepository: repo,
            scope: {
                bookId: 'MAT',
                chapterStart: 5,
                chapterEnd: 7,
                verseStart: null,
                verseEnd: null,
            },
        });
        expect(r.verses.length).toBe(30);
        expect(new Set(r.verses.map((v) => v.chapter))).toEqual(new Set([5, 6, 7]));
    });

    it('filters to a cross-chapter verse range "Romanos 1:18-3:20"', async () => {
        // 10 verses/chapter fixture; range = ch1 v8-10 + ch2 v1-10 + ch3 v1-2 = 15.
        const repo = makeRepo(16, 'Romanos');
        const r = await loadBookVerses({
            bookId: 'ROM',
            displayLanguage: 'es',
            bibleRepository: repo,
            scope: {
                bookId: 'ROM',
                chapterStart: 1,
                chapterEnd: 3,
                verseStart: 8,
                verseEnd: 2,
            },
        });
        const ch1 = r.verses.filter((v) => v.chapter === 1);
        const ch2 = r.verses.filter((v) => v.chapter === 2);
        const ch3 = r.verses.filter((v) => v.chapter === 3);
        expect(ch1.map((v) => v.verse)).toEqual([8, 9, 10]);
        expect(ch2.map((v) => v.verse)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(ch3.map((v) => v.verse)).toEqual([1, 2]);
    });

    it('throws when scope.bookId mismatches input.bookId', async () => {
        const repo = makeRepo(1, 'Filemón');
        await expect(
            loadBookVerses({
                bookId: 'PHM',
                displayLanguage: 'es',
                bibleRepository: repo,
                scope: {
                    bookId: 'ROM',
                    chapterStart: 1,
                    chapterEnd: 1,
                    verseStart: null,
                    verseEnd: null,
                },
            }),
        ).rejects.toThrow(/does not match/);
    });
});
