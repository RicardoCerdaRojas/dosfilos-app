import { describe, it, expect } from 'vitest';
import { RVR1960Repository } from '../RVR1960Repository';

/**
 * Same truth table as the (now-dead) web copy, but locks the infra
 * implementation since that's the one wired into `LocalBibleService` via
 * `@dosfilos/infrastructure`. Returns `book` as the BOOK_MAPPING KEY
 * (e.g. "Filemón"), not the abbreviation — that's the infra contract.
 */
describe('infra RVR1960Repository.parseReference', () => {
    const repo = new RVR1960Repository();

    describe('standard chapter:verse forms', () => {
        it('parses Juan 3:16', () => {
            expect(repo.parseReference('Juan 3:16')).toEqual({
                book: 'Juan',
                chapter: 3,
                verseStart: 16,
                verseEnd: undefined,
            });
        });
        it('parses Romanos 8:28-30', () => {
            expect(repo.parseReference('Romanos 8:28-30')).toEqual({
                book: 'Romanos',
                chapter: 8,
                verseStart: 28,
                verseEnd: 30,
            });
        });
    });

    describe('book-only references', () => {
        it('parses Filemón', () => {
            expect(repo.parseReference('Filemón')).toEqual({
                book: 'Filemón',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('parses lowercase filemon', () => {
            expect(repo.parseReference('filemon')).toEqual({
                book: 'Filemon',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
    });

    describe('chapter-only references (multi-chapter books)', () => {
        it('parses Romanos 1', () => {
            expect(repo.parseReference('Romanos 1')).toEqual({
                book: 'Romanos',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('rejects chapter ranges', () => {
            expect(repo.parseReference('Romanos 1-3')).toBeNull();
        });
    });

    describe('single-chapter books: number = verse', () => {
        it('parses Filemón 8', () => {
            expect(repo.parseReference('Filemón 8')).toEqual({
                book: 'Filemón',
                chapter: 1,
                verseStart: 8,
                verseEnd: undefined,
            });
        });
        it('parses Filemón 8-21', () => {
            expect(repo.parseReference('Filemón 8-21')).toEqual({
                book: 'Filemón',
                chapter: 1,
                verseStart: 8,
                verseEnd: 21,
            });
        });
        it('parses Judas 4-7', () => {
            expect(repo.parseReference('Judas 4-7')).toEqual({
                book: 'Judas',
                chapter: 1,
                verseStart: 4,
                verseEnd: 7,
            });
        });
    });

    describe('invalid references', () => {
        it('rejects unknown books', () => {
            expect(repo.parseReference('Foobar 1:1')).toBeNull();
        });
        it('rejects empty input', () => {
            expect(repo.parseReference('')).toBeNull();
        });
    });
});
