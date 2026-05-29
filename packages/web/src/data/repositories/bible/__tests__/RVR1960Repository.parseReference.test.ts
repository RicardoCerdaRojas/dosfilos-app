import { describe, it, expect } from 'vitest';
import { RVR1960Repository } from '../RVR1960Repository';

/**
 * Lock the parseReference truth table so a future refactor can't quietly
 * shrink the accepted shapes. Sentinel `verseStart === 0` means "no
 * specific verse" — covers book-only and chapter-only references.
 */
describe('RVR1960Repository.parseReference', () => {
    const repo = new RVR1960Repository();

    describe('standard chapter:verse forms', () => {
        it('parses Juan 3:16', () => {
            expect(repo.parseReference('Juan 3:16')).toEqual({
                book: 'jo',
                chapter: 3,
                verseStart: 16,
                verseEnd: undefined,
            });
        });
        it('parses Romanos 8:28-30', () => {
            expect(repo.parseReference('Romanos 8:28-30')).toEqual({
                book: 'rm',
                chapter: 8,
                verseStart: 28,
                verseEnd: 30,
            });
        });
        it('accepts en-dash range Juan 3:16–17', () => {
            expect(repo.parseReference('Juan 3:16–17')).toEqual({
                book: 'jo',
                chapter: 3,
                verseStart: 16,
                verseEnd: 17,
            });
        });
        it('accepts dot separator Juan 3.16', () => {
            expect(repo.parseReference('Juan 3.16')).toEqual({
                book: 'jo',
                chapter: 3,
                verseStart: 16,
                verseEnd: undefined,
            });
        });
    });

    describe('book-only references', () => {
        it('parses Filemón', () => {
            expect(repo.parseReference('Filemón')).toEqual({
                book: 'phm',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('parses lowercase filemon', () => {
            expect(repo.parseReference('filemon')).toEqual({
                book: 'phm',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('parses Romanos (multi-chapter, defaults to chapter 1)', () => {
            expect(repo.parseReference('Romanos')).toEqual({
                book: 'rm',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
    });

    describe('chapter-only references (multi-chapter books)', () => {
        it('parses Romanos 1', () => {
            expect(repo.parseReference('Romanos 1')).toEqual({
                book: 'rm',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('parses Génesis 1', () => {
            expect(repo.parseReference('Génesis 1')).toEqual({
                book: 'gn',
                chapter: 1,
                verseStart: 0,
                verseEnd: undefined,
            });
        });
        it('rejects chapter ranges like Romanos 1-3', () => {
            expect(repo.parseReference('Romanos 1-3')).toBeNull();
        });
    });

    describe('single-chapter books: number = verse, not chapter', () => {
        it('parses Filemón 8 as verse 8', () => {
            expect(repo.parseReference('Filemón 8')).toEqual({
                book: 'phm',
                chapter: 1,
                verseStart: 8,
                verseEnd: undefined,
            });
        });
        it('parses Filemón 8-21 as verse range', () => {
            expect(repo.parseReference('Filemón 8-21')).toEqual({
                book: 'phm',
                chapter: 1,
                verseStart: 8,
                verseEnd: 21,
            });
        });
        it('parses Judas 4-7', () => {
            expect(repo.parseReference('Judas 4-7')).toEqual({
                book: 'jd',
                chapter: 1,
                verseStart: 4,
                verseEnd: 7,
            });
        });
        it('parses Abdías 15', () => {
            expect(repo.parseReference('Abdías 15')).toEqual({
                book: 'ob',
                chapter: 1,
                verseStart: 15,
                verseEnd: undefined,
            });
        });
        it('still accepts the redundant Filemón 1:8-21 form', () => {
            expect(repo.parseReference('Filemón 1:8-21')).toEqual({
                book: 'phm',
                chapter: 1,
                verseStart: 8,
                verseEnd: 21,
            });
        });
    });

    describe('invalid references', () => {
        it('rejects unknown books', () => {
            expect(repo.parseReference('Foobar 1:1')).toBeNull();
        });
        it('rejects malformed strings', () => {
            expect(repo.parseReference('???')).toBeNull();
            expect(repo.parseReference('')).toBeNull();
        });
        it('rejects Juan 3-4:1 (chapter range plus verse)', () => {
            expect(repo.parseReference('Juan 3-4:1')).toBeNull();
        });
    });
});
