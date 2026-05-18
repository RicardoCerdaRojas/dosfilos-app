import type { BookRecommendations } from '../types';

/**
 * Curated bibliography for Mateo. Hero book #4 — added 2026-05-18
 * after telemetry showed pastors planning Mateo series consistently
 * hit `recommendation_gap_no_suggestions` on `commentary-expository`
 * and `commentary-critical`.
 *
 * Selection criteria mirror Hebreos hero entry:
 *   1. Highly preached gospel (the longest synoptic, frequent series
 *      target on Sermón del Monte, Misión de los 12, Discursos).
 *   2. Strong commentary tradition across academic tiers — Davies-
 *      Allison + France + Carson cover the spectrum.
 *   3. Demands engagement with second-temple Jewish background
 *      (Keener, Schnabel) for the Jewish-Messiah framing.
 */
export const MATTHEW_RECOMMENDATIONS: BookRecommendations = {
    bookId: 'MAT',
    bySourceType: {
        'commentary-critical': [
            {
                author: 'Davies, W. D.; Allison, Dale C.',
                title: 'A Critical and Exegetical Commentary on the Gospel According to Saint Matthew',
                series: 'ICC (3 vols.)',
                publisher: 'T&T Clark',
                year: 1997,
                isbn: '9780567094810',
                tier: 'essential',
                languages: ['en'],
                rationale: '3 vols. Estándar técnico absoluto. Análisis verso por verso del griego + crítica textual + recepción patrística.',
            },
            {
                author: 'Luz, Ulrich',
                title: 'Matthew: A Commentary',
                series: 'Hermeneia (3 vols.)',
                publisher: 'Fortress',
                year: 2007,
                isbn: '9780800660994',
                tier: 'essential',
                languages: ['en', 'de'],
                rationale: 'Comentario crítico-académico de máximo rigor. Énfasis en historia de la interpretación (Wirkungsgeschichte).',
            },
            {
                author: 'Nolland, John',
                title: 'The Gospel of Matthew: A Commentary on the Greek Text',
                series: 'NIGTC',
                publisher: 'Eerdmans',
                year: 2005,
                isbn: '9780802823892',
                tier: 'essential',
                languages: ['en'],
                rationale: 'Comentario sobre el texto griego — morfosintaxis verso a verso.',
            },
            {
                author: 'Hagner, Donald A.',
                title: 'Matthew 1-13 / Matthew 14-28',
                series: 'WBC 33A & 33B',
                publisher: 'Word',
                year: 1993,
                isbn: '9780849902321',
                tier: 'essential',
                languages: ['en'],
                rationale: '2 vols. Estructura WBC con análisis sintáctico, forma y aparato textual.',
            },
        ],
        'commentary-expository': [
            {
                author: 'France, R. T.',
                title: 'The Gospel of Matthew',
                series: 'NICNT',
                publisher: 'Eerdmans',
                year: 2007,
                isbn: '9780802825018',
                tier: 'essential',
                languages: ['en'],
                rationale: 'Mejor síntesis evangélica reciente. Equilibra exégesis técnica y aplicación pastoral.',
            },
            {
                author: 'Carson, D. A.',
                title: 'Matthew',
                series: 'EBC (revised)',
                publisher: 'Zondervan',
                year: 2010,
                isbn: '9780310500100',
                tier: 'essential',
                languages: ['en', 'es'],
                rationale: 'Profundidad sintáctica con sensibilidad pastoral. Traducción al español disponible.',
            },
            {
                author: 'Osborne, Grant R.',
                title: 'Matthew',
                series: 'Zondervan Exegetical Commentary on the New Testament',
                publisher: 'Zondervan',
                year: 2010,
                isbn: '9780310243571',
                tier: 'recommended',
                languages: ['en'],
                rationale: 'Estructura ZECNT con diagramas sintácticos y "Theology in Application".',
            },
            {
                author: 'Blomberg, Craig L.',
                title: 'Matthew',
                series: 'New American Commentary 22',
                publisher: 'Broadman & Holman',
                year: 1992,
                isbn: '9780805401226',
                tier: 'recommended',
                languages: ['en', 'es'],
                rationale: 'Clásico evangélico equilibrado. Hay traducción al español.',
            },
            {
                author: 'Keener, Craig S.',
                title: 'A Commentary on the Gospel of Matthew',
                series: null,
                publisher: 'Eerdmans',
                year: 1999,
                isbn: '9780802838216',
                tier: 'recommended',
                languages: ['en'],
                rationale: 'Énfasis fuerte en trasfondo histórico-judío del segundo templo.',
            },
            {
                author: 'Bruner, Frederick Dale',
                title: 'Matthew: A Commentary (2 vols.)',
                series: null,
                publisher: 'Eerdmans',
                year: 2004,
                isbn: '9780802811189',
                tier: 'standard',
                languages: ['en'],
                rationale: 'Lectura teológico-pastoral más extensa. Útil para sermones devocionales.',
            },
        ],
        'theological-monograph': [
            {
                author: 'Bauer, David R.',
                title: 'The Structure of Matthew\'s Gospel: A Study in Literary Design',
                series: 'JSNTSup 31',
                publisher: 'Sheffield Academic Press',
                year: 1988,
                isbn: '9781850751069',
                tier: 'recommended',
                languages: ['en'],
                rationale: 'Análisis estructural-literario clásico (5 discursos / cumplimiento / desde-entonces).',
            },
            {
                author: 'Kingsbury, Jack Dean',
                title: 'Matthew as Story',
                series: null,
                publisher: 'Fortress',
                year: 1988,
                isbn: '9780800620998',
                tier: 'recommended',
                languages: ['en'],
                rationale: 'Lectura narrativa del evangelio — útil para identificar arcos y momentos clímax.',
            },
            {
                author: 'Schnabel, Eckhard J.',
                title: 'Early Christian Mission, Volume 1: Jesus and the Twelve',
                series: null,
                publisher: 'IVP Academic',
                year: 2004,
                isbn: '9780830827916',
                tier: 'standard',
                languages: ['en'],
                rationale: 'Para predicar Mateo 10 (envío de los 12): trasfondo misionero del segundo templo.',
            },
        ],
        'historical-background': [
            {
                author: 'Keener, Craig S.',
                title: 'The IVP Bible Background Commentary: New Testament',
                series: null,
                publisher: 'IVP Academic',
                year: 2014,
                isbn: '9780830824786',
                tier: 'recommended',
                languages: ['en', 'es'],
                rationale: 'Trasfondo cultural verso a verso. Versión en español: "Comentario del contexto cultural de la Biblia: NT".',
            },
        ],
        'primary-source-ancient': [
            {
                author: 'Josephus, Flavius',
                title: 'Antiquities of the Jews / The Jewish War',
                series: null,
                publisher: 'Hendrickson',
                year: 1987,
                isbn: '9780913573860',
                tier: 'recommended',
                languages: ['en', 'es'],
                rationale: 'Indispensable para contexto político-religioso del primer siglo (fariseos, saduceos, herodianos).',
            },
        ],
    },
};
