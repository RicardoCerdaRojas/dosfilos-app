import { describe, it, expect } from 'vitest';
import {
    findLibraryResourceForRecommendation,
    matchRecommendationToResource,
    type LibraryResourceLike,
} from '../libraryMatch';
import type { SourceRecommendation } from '../types';

function makeRec(overrides: Partial<SourceRecommendation>): SourceRecommendation {
    return {
        author: 'Cockerill, Gareth Lee',
        title: 'The Epistle to the Hebrews',
        series: 'NICNT',
        publisher: 'Eerdmans',
        year: 2012,
        isbn: '9780802824929',
        tier: 'essential',
        languages: ['en'],
        ...overrides,
    };
}

function makeRes(overrides: Partial<LibraryResourceLike>): LibraryResourceLike {
    return {
        id: 'res-1',
        title: 'The Epistle to the Hebrews',
        author: 'Cockerill, Gareth',
        ...overrides,
    };
}

describe('matchRecommendationToResource — series acronym', () => {
    it('matches when the resource title contains the series acronym (WBC)', () => {
        const rec = makeRec({ author: 'Lane', title: 'Hebrews 1-8', series: 'WBC 47A' });
        const res = makeRes({ title: 'Hebrews WBC Lane', author: 'Lane' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });

    it('matches BDAG by acronym in user-uploaded title', () => {
        const rec = makeRec({
            author: 'Bauer; Danker; Arndt',
            title: 'A Greek-English Lexicon of the New Testament',
            series: 'BDAG',
            isbn: null,
        });
        const res = makeRes({ id: 'r-bdag', title: 'BDAG (3rd ed.)', author: '' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });

    it('does NOT match when acronym would be a substring (avoid AWBC false-positive)', () => {
        const rec = makeRec({ series: 'WBC' });
        const res = makeRes({ title: 'AWBC random title', author: '' });
        expect(matchRecommendationToResource(rec, res)).toBe(false);
    });

    it('extracts acronym from "Anchor Yale Bible 36" → "Anchor" (4 chars, accepted)', () => {
        const rec = makeRec({
            author: 'Koester',
            title: 'Hebrews',
            series: 'Anchor Yale Bible 36',
            isbn: null,
        });
        const res = makeRes({ title: 'Hebrews Anchor', author: 'Koester' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });

    it('skips acronyms shorter than 3 chars', () => {
        const rec = makeRec({ series: 'A' });
        const res = makeRes({ title: 'A book about A things', author: '' });
        expect(matchRecommendationToResource(rec, res)).toBe(false);
    });
});

describe('matchRecommendationToResource — title token overlap', () => {
    it('matches when titles overlap ≥70% AND surnames match', () => {
        const rec = makeRec({
            author: 'Cockerill, Gareth Lee',
            title: 'The Epistle to the Hebrews',
            series: null,
            isbn: null,
        });
        const res = makeRes({ title: 'Epistle Hebrews Commentary', author: 'Gareth Cockerill' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });

    it('rejects identical title with DIFFERENT author (Hebrews by Lane vs Hebrews by Cockerill)', () => {
        const rec = makeRec({
            author: 'Cockerill, Gareth Lee',
            title: 'The Epistle to the Hebrews',
            series: null,
            isbn: null,
        });
        const res = makeRes({ title: 'The Epistle to the Hebrews', author: 'Lane, William' });
        expect(matchRecommendationToResource(rec, res)).toBe(false);
    });

    it('accepts title-only match when resource has no author (user upload without metadata)', () => {
        const rec = makeRec({
            author: 'Cockerill, Gareth Lee',
            title: 'The Epistle to the Hebrews Commentary',
            series: null,
            isbn: null,
        });
        const res = makeRes({ title: 'Epistle Hebrews Commentary Volume', author: '' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });

    it('rejects when token overlap is below 70%', () => {
        const rec = makeRec({
            title: 'The Epistle to the Hebrews',
            series: null,
            isbn: null,
        });
        const res = makeRes({ title: 'Romans Commentary', author: '' });
        expect(matchRecommendationToResource(rec, res)).toBe(false);
    });

    it('case- and accent-insensitive', () => {
        const rec = makeRec({
            author: 'González, Juan',
            title: 'Análisis Exegético de Romanos',
            series: null,
            isbn: null,
        });
        const res = makeRes({ title: 'analisis exegetico de romanos', author: 'JUAN GONZALEZ' });
        expect(matchRecommendationToResource(rec, res)).toBe(true);
    });
});

describe('findLibraryResourceForRecommendation', () => {
    it('returns the first matching resource', () => {
        const rec = makeRec({ series: 'BDAG', author: '', title: 'Greek lexicon', isbn: null });
        const resources: LibraryResourceLike[] = [
            { id: 'r1', title: 'Random theology book', author: 'X' },
            { id: 'r2', title: 'BDAG Lexicon', author: 'Bauer' },
            { id: 'r3', title: 'Another BDAG copy', author: '' },
        ];
        const result = findLibraryResourceForRecommendation(rec, resources);
        expect(result?.id).toBe('r2');
    });

    it('returns null when no resource matches', () => {
        const rec = makeRec({ series: 'BDAG', author: '', title: 'Greek lexicon', isbn: null });
        const resources: LibraryResourceLike[] = [
            { id: 'r1', title: 'Romans Commentary', author: 'Moo' },
            { id: 'r2', title: 'Genesis Notes', author: 'Wenham' },
        ];
        expect(findLibraryResourceForRecommendation(rec, resources)).toBeNull();
    });

    it('returns null on empty resources array', () => {
        const rec = makeRec({});
        expect(findLibraryResourceForRecommendation(rec, [])).toBeNull();
    });
});
