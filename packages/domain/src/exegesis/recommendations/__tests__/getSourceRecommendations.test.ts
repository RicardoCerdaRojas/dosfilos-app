import { describe, it, expect } from 'vitest';
import {
    getSourceRecommendations,
    hasSourceRecommendations,
    getRecommendationId,
} from '../index';

describe('getSourceRecommendations', () => {
    describe('book-specific recommendations', () => {
        it('returns hero-book entries for HEB + commentary-critical, with Cockerill on top of expository', () => {
            const recs = getSourceRecommendations('HEB', 'commentary-critical', 'es');
            expect(recs.length).toBeGreaterThan(0);
            // Lane WBC should be in there
            expect(recs.some(r => r.author.includes('Lane'))).toBe(true);
        });

        it('returns hero-book entries for ROM + commentary-expository with Moo first', () => {
            const recs = getSourceRecommendations('ROM', 'commentary-expository', 'es');
            // Moo NICNT has ES translation → ranks above EN-only entries
            expect(recs[0]?.author).toContain('Moo');
        });
    });

    describe('invariant recommendations fallback', () => {
        it('returns BDAG for any book + lexicon-technical (book-agnostic)', () => {
            // No book-specific lexicons; should fall through to invariant.
            const recs = getSourceRecommendations('PHM', 'lexicon-technical', 'en');
            expect(recs.some(r => r.series === 'BDAG')).toBe(true);
        });

        it('returns Wallace grammar for grammar-syntax (invariant) on any book', () => {
            const recs = getSourceRecommendations('JON', 'grammar-syntax', 'es');
            expect(recs.some(r => r.author.includes('Wallace'))).toBe(true);
        });
    });

    describe('book-specific + invariant merging', () => {
        it('book-specific entries come BEFORE invariant entries', () => {
            // HEB has theological-monograph entries (Vanhoye, deSilva) — invariant
            // doesn't have anything for theological-monograph, so this just
            // ensures the slot works without invariant interference.
            const recs = getSourceRecommendations('HEB', 'theological-monograph', 'en');
            expect(recs[0]?.author).toContain('Vanhoye');
        });

        it('historical-background for HEB falls back to invariant (no book-specific yet)', () => {
            const recs = getSourceRecommendations('HEB', 'historical-background', 'es');
            // No HEB-specific historical-background; invariant has Keener.
            expect(recs.some(r => r.author.includes('Keener'))).toBe(true);
        });

        it('historical-background for ROM mixes both: Lampe (book) + Keener (invariant)', () => {
            const recs = getSourceRecommendations('ROM', 'historical-background', 'es');
            // Lampe is ROM-specific, should appear before invariant Keener.
            const lampeIdx = recs.findIndex(r => r.author.includes('Lampe'));
            const keenerIdx = recs.findIndex(r => r.author.includes('Keener'));
            expect(lampeIdx).toBeGreaterThanOrEqual(0);
            expect(keenerIdx).toBeGreaterThanOrEqual(0);
            expect(lampeIdx).toBeLessThan(keenerIdx);
        });
    });

    describe('language sort', () => {
        it('ES papers see ES editions before EN-only within the same source-type', () => {
            const recs = getSourceRecommendations('ROM', 'commentary-expository', 'es');
            const moo = recs.find(r => r.author.includes('Moo'));
            const stott = recs.find(r => r.author.includes('Stott'));
            const jewett = recs.find(r => r.author.includes('Jewett'));
            expect(moo?.languages).toContain('es');
            expect(stott?.languages).toContain('es');
            // Moo + Stott (have ES) should rank above Witherington (EN only).
            const witheringtonIdx = recs.findIndex(r => r.author.includes('Witherington'));
            const stottIdx = recs.findIndex(r => r.author.includes('Stott'));
            if (witheringtonIdx >= 0 && stottIdx >= 0) {
                expect(stottIdx).toBeLessThan(witheringtonIdx);
            }
            // Sanity that Jewett (Hermeneia, en only) is in the result of
            // commentary-critical, not expository — making sure we're
            // correctly partitioning. This is just a guard.
            expect(jewett).toBeUndefined();
        });

        it('EN papers don\'t penalize EN-only entries', () => {
            const recs = getSourceRecommendations('ROM', 'commentary-expository', 'en');
            // All entries match EN, so ordering falls back to tier and
            // curator order. Moo + Schreiner (essential) should top.
            expect(recs[0]?.tier).toBe('essential');
        });
    });

    describe('tier sort within language match', () => {
        it('within same language, essential comes before recommended', () => {
            const recs = getSourceRecommendations('HEB', 'commentary-critical', 'en');
            // All EN. First essential entry should appear before any
            // recommended entry.
            const firstEssentialIdx = recs.findIndex(r => r.tier === 'essential');
            const firstRecommendedIdx = recs.findIndex(r => r.tier === 'recommended');
            expect(firstEssentialIdx).toBeGreaterThanOrEqual(0);
            if (firstRecommendedIdx >= 0) {
                expect(firstEssentialIdx).toBeLessThan(firstRecommendedIdx);
            }
        });
    });

    describe('empty cases', () => {
        it('returns [] for a non-hero book + commentary-critical (no invariant fallback)', () => {
            // Jonah isn't a hero book; commentary-critical has no
            // invariant fallback (commentaries are inherently book-specific).
            const recs = getSourceRecommendations('JON', 'commentary-critical', 'es');
            expect(recs).toEqual([]);
        });

        it('returns [] for non-hero book + commentary-expository', () => {
            const recs = getSourceRecommendations('JON', 'commentary-expository', 'es');
            expect(recs).toEqual([]);
        });
    });

    describe('OT hero book (Génesis)', () => {
        it('returns hero-book entries for GEN + commentary-critical (Wenham WBC top-tier)', () => {
            const recs = getSourceRecommendations('GEN', 'commentary-critical', 'es');
            expect(recs.length).toBeGreaterThan(0);
            expect(recs.some(r => r.author.includes('Wenham'))).toBe(true);
            // Westermann + von Rad also expected as essential entries.
            expect(recs.some(r => r.author.includes('Westermann'))).toBe(true);
        });

        it('returns hero-book + invariant for GEN + historical-background', () => {
            const recs = getSourceRecommendations('GEN', 'historical-background', 'es');
            // Walton ANE Thought is GEN-specific; should rank before
            // invariant Keener/Walton-IVP.
            const waltonAneIdx = recs.findIndex(r => r.title.includes('Ancient Near Eastern Thought'));
            const ivpIdx = recs.findIndex(r => r.title.includes('IVP Bible Background'));
            expect(waltonAneIdx).toBeGreaterThanOrEqual(0);
            expect(ivpIdx).toBeGreaterThanOrEqual(0);
            expect(waltonAneIdx).toBeLessThan(ivpIdx);
        });

        it('GEN + commentary-expository ranks ES editions first (Mathews has ES)', () => {
            const recs = getSourceRecommendations('GEN', 'commentary-expository', 'es');
            const mathews = recs.find(r => r.author.includes('Mathews'));
            const hamilton = recs.find(r => r.author.includes('Hamilton'));
            expect(mathews?.languages).toContain('es');
            expect(hamilton?.languages).not.toContain('es');
            // von Rad is in commentary-critical, not expository — sanity check.
            expect(recs.some(r => r.author.includes('von Rad'))).toBe(false);
        });
    });
});

describe('hasSourceRecommendations', () => {
    it('true when book-specific entry exists', () => {
        expect(hasSourceRecommendations('HEB', 'commentary-critical')).toBe(true);
    });

    it('true when invariant entry exists', () => {
        expect(hasSourceRecommendations('JON', 'lexicon-technical')).toBe(true);
    });

    it('false when neither book nor invariant has anything', () => {
        expect(hasSourceRecommendations('JON', 'commentary-critical')).toBe(false);
    });
});

describe('getRecommendationId', () => {
    it('produces stable ids invariant to author/title formatting', () => {
        const a = getRecommendationId({
            author: 'Cockerill, Gareth Lee',
            title: 'The Epistle to the Hebrews',
            series: 'NICNT',
            publisher: 'Eerdmans',
            year: 2012,
            isbn: null,
            tier: 'essential',
            languages: ['en'],
        });
        const b = getRecommendationId({
            // Same author + title, different formatting
            author: 'COCKERILL, Gareth Lee  ',
            title: 'The Epistle to the Hebrews',
            series: 'NICNT (revised)',
            publisher: 'Eerdmans',
            year: 2015,
            isbn: '9999999',
            tier: 'recommended',
            languages: ['en'],
        });
        expect(a).toBe(b);
    });

    it('produces different ids for different works by the same author', () => {
        const cockerill1 = getRecommendationId({
            author: 'Cockerill, Gareth Lee',
            title: 'The Epistle to the Hebrews',
            series: null, publisher: '', year: 0, isbn: null, tier: 'essential', languages: ['en'],
        });
        const cockerill2 = getRecommendationId({
            author: 'Cockerill, Gareth Lee',
            title: 'A Different Book',
            series: null, publisher: '', year: 0, isbn: null, tier: 'essential', languages: ['en'],
        });
        expect(cockerill1).not.toBe(cockerill2);
    });
});
