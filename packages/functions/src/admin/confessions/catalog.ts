/**
 * Catalog seed — Phase 0 PR 0.2.
 *
 * Mirrors the `subset_v1` of [docs/pastoral-fidelity/data/core-library-seed.json]
 * (ADR-006 § Subset v1 — 14 fuentes firm + Savoy + 39 Articles + SBLGNT
 * stretch). Each entry yields one `/confessions/{id}` document on ingest.
 *
 * `sectionType` distinguishes:
 *   - `sectioned`: discrete sections we ingest (creeds, confessions, catechisms)
 *   - `reference`: standalone catalog record (Schaff collections, biblical texts)
 *
 * Section content lives in `sections.ts` keyed by `confessionId`. The ingest
 * callable joins catalog + section content and writes both.
 */

export interface CatalogEntry {
    id: string;
    title: string;
    shortTitle: string;
    authorOrEditor?: string;
    year: number | string;
    sourceType: string;
    tradition: string;
    language: string;
    sourceUrl: string;
    sectionType: 'sectioned' | 'reference';
    rightsStatus: string;
    license: string;
    licenseUrl?: string;
    copyrightNotice?: string;
    ingestionStatus: string;
    riskLevel: string;
    requiredAttribution?: string[];
    specialHandling?: string[];
    citation: {
        short: string;
        footnote: string;
        bibliography: string;
        ragDisplay: string;
    };
    ragUse?: string[];
    doNotUseFor?: string[];
    ecumenicalAffirmation?: boolean;
    recommendedDocumentsInside?: string[];
}

export const CONFESSION_CATALOG: CatalogEntry[] = [
    {
        id: 'schaff-creeds-vol-1',
        title: 'Creeds of Christendom, Volume I: The History of Creeds',
        shortTitle: 'Schaff, Creeds Vol. I',
        authorOrEditor: 'Philip Schaff',
        year: 1877,
        sourceType: 'Historical collection',
        tradition: 'Cross-denominational',
        language: 'English',
        sourceUrl: 'https://archive.org/details/creedsofchristen01scha',
        sectionType: 'reference',
        rightsStatus: 'Public domain historical work; verify edition-specific metadata before ingestion.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Schaff, Creeds of Christendom, Vol. I',
            footnote: 'Philip Schaff, Creeds of Christendom, vol. 1, The History of Creeds (New York: Harper & Brothers, 1877), section {section_reference}.',
            bibliography: 'Schaff, Philip. Creeds of Christendom. Vol. 1, The History of Creeds. New York: Harper & Brothers, 1877.',
            ragDisplay: 'Source: Philip Schaff, Creeds of Christendom, Vol. I, {section_reference}.',
        },
        ragUse: [
            'Historical background on creeds and confessions',
            'Contextual reference for doctrinal development',
        ],
        doNotUseFor: ['Final biblical authority', 'Replacing direct exegesis of Scripture'],
    },
    {
        id: 'schaff-creeds-vol-2',
        title: 'Creeds of Christendom, Volume II: The Greek and Latin Creeds',
        shortTitle: 'Schaff, Creeds Vol. II',
        authorOrEditor: 'Philip Schaff',
        year: 1877,
        sourceType: 'Historical collection',
        tradition: 'Early church / ecumenical creeds',
        language: 'English, Greek, Latin',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/creeds2.html',
        sectionType: 'reference',
        rightsStatus: 'Public domain historical work; verify edition-specific metadata before ingestion.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Schaff, Creeds of Christendom, Vol. II',
            footnote: 'Philip Schaff, Creeds of Christendom, vol. 2, The Greek and Latin Creeds (New York: Harper & Brothers, 1877), {section_reference}.',
            bibliography: 'Schaff, Philip. Creeds of Christendom. Vol. 2, The Greek and Latin Creeds. New York: Harper & Brothers, 1877.',
            ragDisplay: 'Source: Philip Schaff, Creeds of Christendom, Vol. II, {section_reference}.',
        },
        ragUse: ['Ecumenical creeds', 'Trinitarian doctrine', 'Christology'],
        recommendedDocumentsInside: ["Apostles' Creed", 'Nicene Creed', 'Athanasian Creed', 'Definition of Chalcedon'],
    },
    {
        id: 'schaff-creeds-vol-3',
        title: 'Creeds of Christendom, Volume III: The Evangelical Protestant Creeds',
        shortTitle: 'Schaff, Creeds Vol. III',
        authorOrEditor: 'Philip Schaff',
        year: 1877,
        sourceType: 'Historical collection',
        tradition: 'Protestant',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/creeds3.html',
        sectionType: 'reference',
        rightsStatus: 'Public domain historical work; verify edition-specific metadata before ingestion.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Schaff, Creeds of Christendom, Vol. III',
            footnote: 'Philip Schaff, Creeds of Christendom, vol. 3, The Evangelical Protestant Creeds (New York: Harper & Brothers, 1877), {section_reference}.',
            bibliography: 'Schaff, Philip. Creeds of Christendom. Vol. 3, The Evangelical Protestant Creeds. New York: Harper & Brothers, 1877.',
            ragDisplay: 'Source: Philip Schaff, Creeds of Christendom, Vol. III, {section_reference}.',
        },
        ragUse: ['Comparative Protestant confessions', 'Reformation theology'],
        recommendedDocumentsInside: [
            'Augsburg Confession', 'Thirty-Nine Articles', 'Heidelberg Catechism',
            'Belgic Confession', 'Canons of Dort', 'Westminster Confession', 'Savoy Declaration',
        ],
    },
    {
        id: 'apostles-creed',
        title: "The Apostles' Creed",
        shortTitle: "Apostles' Creed",
        year: 'Early church; received Western form developed over time',
        sourceType: 'Ecumenical creed',
        tradition: 'Ancient Christian',
        language: 'Latin / English',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/creeds2.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        ecumenicalAffirmation: true,
        citation: {
            short: "Apostles' Creed",
            footnote: "The Apostles' Creed, in Philip Schaff, Creeds of Christendom, vol. 2 (New York: Harper & Brothers, 1877), {section_reference}.",
            bibliography: "The Apostles' Creed. In Philip Schaff, Creeds of Christendom, Vol. 2. New York: Harper & Brothers, 1877.",
            ragDisplay: "Source: The Apostles' Creed, {section_reference}.",
        },
        ragUse: ['Basic Christian doctrine', 'Trinity', 'Incarnation', 'Resurrection'],
    },
    {
        id: 'nicene-creed',
        title: 'The Nicene-Constantinopolitan Creed',
        shortTitle: 'Nicene Creed',
        year: '325 / 381',
        sourceType: 'Ecumenical creed',
        tradition: 'Ancient Christian',
        language: 'Greek / Latin / English',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/creeds2.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        ecumenicalAffirmation: true,
        citation: {
            short: 'Nicene Creed',
            footnote: 'The Nicene-Constantinopolitan Creed, in Philip Schaff, Creeds of Christendom, vol. 2 (New York: Harper & Brothers, 1877), {section_reference}.',
            bibliography: 'The Nicene-Constantinopolitan Creed. In Philip Schaff, Creeds of Christendom, Vol. 2. New York: Harper & Brothers, 1877.',
            ragDisplay: 'Source: Nicene-Constantinopolitan Creed, {section_reference}.',
        },
        ragUse: ['Doctrine of God', 'Trinity', 'Deity of Christ', 'Christological orthodoxy'],
    },
    {
        id: 'athanasian-creed',
        title: 'The Athanasian Creed',
        shortTitle: 'Athanasian Creed',
        year: 'Probably 5th–6th century',
        sourceType: 'Western creed',
        tradition: 'Ancient Western Christian',
        language: 'Latin / English',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/creeds2.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        ecumenicalAffirmation: true,
        citation: {
            short: 'Athanasian Creed',
            footnote: 'The Athanasian Creed, in Philip Schaff, Creeds of Christendom, vol. 2 (New York: Harper & Brothers, 1877), {section_reference}.',
            bibliography: 'The Athanasian Creed. In Philip Schaff, Creeds of Christendom, Vol. 2. New York: Harper & Brothers, 1877.',
            ragDisplay: 'Source: The Athanasian Creed, {section_reference}.',
        },
        ragUse: ['Trinity', 'Classical theism', 'Christology'],
    },
    {
        id: 'definition-of-chalcedon',
        title: 'Definition of Chalcedon',
        shortTitle: 'Chalcedonian Definition',
        year: 451,
        sourceType: 'Ecumenical creed / conciliar definition',
        tradition: 'Ancient Christian',
        language: 'Greek / Latin / English',
        sourceUrl: 'https://www.ccel.org/ccel/schaff/npnf214.xi.xiii.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        ecumenicalAffirmation: true,
        citation: {
            short: 'Chalcedonian Definition',
            footnote: 'The Definition of Chalcedon, in Nicene and Post-Nicene Fathers, Second Series, vol. 14 (1900), {section_reference}.',
            bibliography: 'The Definition of Chalcedon. In Nicene and Post-Nicene Fathers, Second Series, Vol. 14. Edited by Philip Schaff and Henry Wace. New York: Christian Literature Publishing, 1900.',
            ragDisplay: 'Source: Definition of Chalcedon, {section_reference}.',
        },
        ragUse: ['Christology', 'Hypostatic union', 'One person and two natures of Christ'],
    },
    {
        id: 'westminster-confession',
        title: 'The Westminster Confession of Faith',
        shortTitle: 'WCF',
        year: 1646,
        sourceType: 'Confession',
        tradition: 'Reformed / Presbyterian',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/westminster-confession.txt',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'WCF {section_reference}',
            footnote: 'The Westminster Confession of Faith, {section_reference}.',
            bibliography: 'The Westminster Confession of Faith. 1646.',
            ragDisplay: 'Source: Westminster Confession of Faith, {section_reference}.',
        },
        ragUse: ['Systematic doctrine', 'Doctrine of Scripture', "God's decree", 'Covenant theology', 'Christology', 'Soteriology'],
    },
    {
        id: 'westminster-shorter-catechism',
        title: 'The Westminster Shorter Catechism',
        shortTitle: 'WSC',
        year: 1647,
        sourceType: 'Catechism',
        tradition: 'Reformed / Presbyterian',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/westminster-shorter-cat.txt',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'WSC {section_reference}',
            footnote: 'The Westminster Shorter Catechism, {section_reference}.',
            bibliography: 'The Westminster Shorter Catechism. 1647.',
            ragDisplay: 'Source: Westminster Shorter Catechism, {section_reference}.',
        },
        ragUse: ['Doctrinal teaching', 'Catechetical instruction', 'Discipleship'],
    },
    {
        id: 'westminster-larger-catechism',
        title: 'The Westminster Larger Catechism',
        shortTitle: 'WLC',
        year: 1647,
        sourceType: 'Catechism',
        tradition: 'Reformed / Presbyterian',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/westminster-larger-cat.txt',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'WLC {section_reference}',
            footnote: 'The Westminster Larger Catechism, {section_reference}.',
            bibliography: 'The Westminster Larger Catechism. 1647.',
            ragDisplay: 'Source: Westminster Larger Catechism, {section_reference}.',
        },
        ragUse: ['In-depth doctrinal exposition', 'Theological depth', 'Pastoral teaching'],
    },
    {
        id: 'belgic-confession',
        title: 'The Belgic Confession',
        shortTitle: 'Belgic Confession',
        year: 1561,
        sourceType: 'Confession',
        tradition: 'Reformed / Continental',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/belgic.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Belgic Confession, Art. {section_reference}',
            footnote: 'The Belgic Confession, Article {section_reference}.',
            bibliography: 'The Belgic Confession. 1561.',
            ragDisplay: 'Source: Belgic Confession, Article {section_reference}.',
        },
        ragUse: ['Reformed continental doctrine', 'Doctrine of God', 'Ecclesiology'],
    },
    {
        id: 'heidelberg-catechism',
        title: 'The Heidelberg Catechism',
        shortTitle: 'Heidelberg Catechism',
        year: 1563,
        sourceType: 'Catechism',
        tradition: 'Reformed / Continental',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/heidelberg-cat-ext.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Heidelberg Catechism, {section_reference}',
            footnote: 'The Heidelberg Catechism, {section_reference}.',
            bibliography: 'The Heidelberg Catechism. 1563.',
            ragDisplay: 'Source: Heidelberg Catechism, {section_reference}.',
        },
        ragUse: ['Pastoral catechesis', 'Comfort in life and death', 'Discipleship'],
    },
    {
        id: 'canons-of-dort',
        title: 'The Canons of Dort',
        shortTitle: 'Canons of Dort',
        year: 1619,
        sourceType: 'Confession / synodical canons',
        tradition: 'Reformed / Continental',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/canons-of-dort.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Canons of Dort, {section_reference}',
            footnote: 'The Canons of Dort, {section_reference}.',
            bibliography: 'The Canons of Dort. 1619.',
            ragDisplay: 'Source: Canons of Dort, {section_reference}.',
        },
        ragUse: ['Soteriology', 'Predestination', 'Perseverance of the saints'],
    },
    {
        id: 'augsburg-confession',
        title: 'The Augsburg Confession',
        shortTitle: 'Augsburg Confession',
        year: 1530,
        sourceType: 'Confession',
        tradition: 'Lutheran',
        language: 'English',
        sourceUrl: 'https://www.ccel.org/creeds/augsburg-confession.html',
        sectionType: 'sectioned',
        rightsStatus: 'Public domain historical text; use a public-domain edition.',
        license: 'Public Domain',
        ingestionStatus: 'approved_full_ingestion',
        riskLevel: 'low',
        citation: {
            short: 'Augsburg Confession, Art. {section_reference}',
            footnote: 'The Augsburg Confession, Article {section_reference}.',
            bibliography: 'The Augsburg Confession. 1530.',
            ragDisplay: 'Source: Augsburg Confession, Article {section_reference}.',
        },
        ragUse: ['Lutheran doctrinal tradition', 'Justification by faith', 'Sacraments'],
    },
];
