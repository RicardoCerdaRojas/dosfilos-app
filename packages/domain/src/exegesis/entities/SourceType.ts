/**
 * Granular taxonomy of source types used in serious exegetical work.
 *
 * Replaces the earlier flat `ProjectSourceRole` (8 values) with a
 * 13-value catalog mapped to standard academic categories. The
 * granularity exists to power three things at once:
 *
 *   1. **Rubric compliance** — a paper rubric expresses minimums per
 *      type (e.g. "≥2 commentary-critical, ≥1 lexicon-technical").
 *      Without granular types, "you have 5 commentaries" can't
 *      distinguish "5 critical" from "5 devotional", and the rubric
 *      becomes useless.
 *
 *   2. **Pedagogical signaling** — the UI can teach the student WHY
 *      a critical commentary differs from an expository one, citing
 *      examples (WBC vs. NIVAC). Each type carries i18n keys for
 *      label, description, and examples so the explanation lives in
 *      one place and stays in sync across surfaces.
 *
 *   3. **Per-step orchestration weights** — the orchestrator uses
 *      `typicalUsage` and `defaultCitationDiscipline` to decide how
 *      generously to cite each source per step kind. Lexicons get
 *      cited often in verse-level steps but rarely in the
 *      introduction; expository commentaries dominate the
 *      conclusion. The plan step lets the student override these
 *      defaults consciously.
 *
 * Categorization follows TMS / Turabian convention. If your
 * institution uses a different scheme, the types stay; the rubric
 * (which is per-paper) maps requirements onto them.
 */
export type SourceType =
    // ── Primary text & textual criticism ────────────────────────────
    | 'biblical-text-edition'      // NA28, BHS, Rahlfs LXX
    | 'critical-apparatus'         // When citing apparatus specifically

    // ── Lexical / linguistic ────────────────────────────────────────
    | 'lexicon-technical'          // BDAG, HALOT, LSJ — full technical entries
    | 'theological-dictionary'     // TDNT, NIDNTTE, EDNT — multi-volume
    | 'grammar-syntax'             // BDF, Wallace, Robertson

    // ── Commentaries (by academic level) ────────────────────────────
    | 'commentary-critical'        // WBC, NIGTC, Hermeneia, ICC, Anchor
    | 'commentary-expository'      // NICOT/NICNT, BECNT, Pillar, Tyndale, NIVAC

    // ── Background / context / monograph literature ─────────────────
    | 'historical-background'      // deSilva, Sanders, Keener IVP, ABD
    | 'theological-monograph'      // Focused academic books on a topic
    | 'journal-article'            // Peer-reviewed articles
    | 'primary-source-ancient'     // Josephus, Philo, Apostolic Fathers, OTP

    // ── Methodological support (never cited inline) ────────────────
    | 'style-template-paper'       // Sample paper used as style reference

    // ── Catch-all ──────────────────────────────────────────────────
    | 'other';

/**
 * Per-source-type metadata used by the rubric, the UI's pedagogical
 * layer, and the orchestrator.
 *
 * `rigorTier` numbers are deliberately small so they're easy to sum
 * for "overall rigor score" displays. `0` is non-citable; `3` is
 * peak academic weight.
 */
export interface SourceTypeMetadata {
    type: SourceType;
    /** i18n key for the human-readable label (under exegesis.sourceTypes.{type}.label). */
    labelI18nKey: string;
    /** i18n key for a one-line description of what this type IS. */
    descriptionI18nKey: string;
    /** i18n key for typical examples ("WBC, NIGTC, Hermeneia"). */
    examplesI18nKey: string;
    /**
     * Academic rigor tier:
     *   3 = technical/critical (BDAG, WBC, NIGTC, BDF) — counts as high-rigor
     *   2 = mid-level academic (NICOT, BECNT, deSilva monograph) — rigorous
     *   1 = popular / devotional (NIVAC, Strong's, popular dictionary) — supportive
     *   0 = non-citable (style template, primary text edition itself)
     */
    rigorTier: 0 | 1 | 2 | 3;
    /**
     * Default citation behavior in generated paragraphs. The student
     * can override per-step in the structural plan; this is the
     * suggested default the system surfaces.
     */
    defaultCitationDiscipline: CitationDiscipline;
    /**
     * Step kinds where this type is typically expected to contribute.
     * Drives the default per-step plan and the "you're using a lexicon
     * in the conclusion, are you sure?" warning.
     */
    typicalUsage: ReadonlyArray<TypicalStepUsage>;
}

export type CitationDiscipline =
    | 'cite-generously'         // Main exegetical voice; can lead paragraphs
    | 'cite-when-relevant'      // Cite when the angle adds something distinct
    | 'cite-sparingly'          // Footnote only on distinctive points
    | 'never-cite';             // Style/structure reference only — never inline

export type TypicalStepUsage = 'verse' | 'conclusion' | 'introduction';

/**
 * Catalog of all source-type metadata. Indexed by type for O(1)
 * lookup. Treat as the single source of truth — the UI, rubric
 * defaults, and orchestrator all read from here.
 *
 * i18n keys follow `exegesis.sourceTypes.{type}.{label|description|examples}`.
 * The translations themselves live in
 * `packages/web/src/i18n/locales/{es,en}/exegesis.json` and are added
 * alongside the UI work in Phase 2 — defining them here keeps the
 * domain layer free of hard-coded user-facing strings.
 */
export const SOURCE_TYPE_CATALOG: Readonly<Record<SourceType, SourceTypeMetadata>> = {
    'biblical-text-edition': {
        type: 'biblical-text-edition',
        labelI18nKey: 'exegesis.sourceTypes.biblical-text-edition.label',
        descriptionI18nKey: 'exegesis.sourceTypes.biblical-text-edition.description',
        examplesI18nKey: 'exegesis.sourceTypes.biblical-text-edition.examples',
        rigorTier: 0,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse'],
    },
    'critical-apparatus': {
        type: 'critical-apparatus',
        labelI18nKey: 'exegesis.sourceTypes.critical-apparatus.label',
        descriptionI18nKey: 'exegesis.sourceTypes.critical-apparatus.description',
        examplesI18nKey: 'exegesis.sourceTypes.critical-apparatus.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse'],
    },
    'lexicon-technical': {
        type: 'lexicon-technical',
        labelI18nKey: 'exegesis.sourceTypes.lexicon-technical.label',
        descriptionI18nKey: 'exegesis.sourceTypes.lexicon-technical.description',
        examplesI18nKey: 'exegesis.sourceTypes.lexicon-technical.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-generously',
        typicalUsage: ['verse'],
    },
    'theological-dictionary': {
        type: 'theological-dictionary',
        labelI18nKey: 'exegesis.sourceTypes.theological-dictionary.label',
        descriptionI18nKey: 'exegesis.sourceTypes.theological-dictionary.description',
        examplesI18nKey: 'exegesis.sourceTypes.theological-dictionary.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse', 'conclusion'],
    },
    'grammar-syntax': {
        type: 'grammar-syntax',
        labelI18nKey: 'exegesis.sourceTypes.grammar-syntax.label',
        descriptionI18nKey: 'exegesis.sourceTypes.grammar-syntax.description',
        examplesI18nKey: 'exegesis.sourceTypes.grammar-syntax.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse'],
    },
    'commentary-critical': {
        type: 'commentary-critical',
        labelI18nKey: 'exegesis.sourceTypes.commentary-critical.label',
        descriptionI18nKey: 'exegesis.sourceTypes.commentary-critical.description',
        examplesI18nKey: 'exegesis.sourceTypes.commentary-critical.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-generously',
        typicalUsage: ['verse', 'conclusion'],
    },
    'commentary-expository': {
        type: 'commentary-expository',
        labelI18nKey: 'exegesis.sourceTypes.commentary-expository.label',
        descriptionI18nKey: 'exegesis.sourceTypes.commentary-expository.description',
        examplesI18nKey: 'exegesis.sourceTypes.commentary-expository.examples',
        rigorTier: 2,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse', 'conclusion'],
    },
    'historical-background': {
        type: 'historical-background',
        labelI18nKey: 'exegesis.sourceTypes.historical-background.label',
        descriptionI18nKey: 'exegesis.sourceTypes.historical-background.description',
        examplesI18nKey: 'exegesis.sourceTypes.historical-background.examples',
        rigorTier: 2,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['introduction', 'verse'],
    },
    'theological-monograph': {
        type: 'theological-monograph',
        labelI18nKey: 'exegesis.sourceTypes.theological-monograph.label',
        descriptionI18nKey: 'exegesis.sourceTypes.theological-monograph.description',
        examplesI18nKey: 'exegesis.sourceTypes.theological-monograph.examples',
        rigorTier: 2,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['introduction', 'conclusion'],
    },
    'journal-article': {
        type: 'journal-article',
        labelI18nKey: 'exegesis.sourceTypes.journal-article.label',
        descriptionI18nKey: 'exegesis.sourceTypes.journal-article.description',
        examplesI18nKey: 'exegesis.sourceTypes.journal-article.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['verse', 'introduction', 'conclusion'],
    },
    'primary-source-ancient': {
        type: 'primary-source-ancient',
        labelI18nKey: 'exegesis.sourceTypes.primary-source-ancient.label',
        descriptionI18nKey: 'exegesis.sourceTypes.primary-source-ancient.description',
        examplesI18nKey: 'exegesis.sourceTypes.primary-source-ancient.examples',
        rigorTier: 3,
        defaultCitationDiscipline: 'cite-when-relevant',
        typicalUsage: ['introduction', 'verse'],
    },
    'style-template-paper': {
        type: 'style-template-paper',
        labelI18nKey: 'exegesis.sourceTypes.style-template-paper.label',
        descriptionI18nKey: 'exegesis.sourceTypes.style-template-paper.description',
        examplesI18nKey: 'exegesis.sourceTypes.style-template-paper.examples',
        rigorTier: 0,
        defaultCitationDiscipline: 'never-cite',
        typicalUsage: [],
    },
    'other': {
        type: 'other',
        labelI18nKey: 'exegesis.sourceTypes.other.label',
        descriptionI18nKey: 'exegesis.sourceTypes.other.description',
        examplesI18nKey: 'exegesis.sourceTypes.other.examples',
        rigorTier: 1,
        defaultCitationDiscipline: 'cite-sparingly',
        typicalUsage: [],
    },
};

/**
 * Source types whose citations may legitimately appear in the assembled
 * paper. The `style-template-paper` type is excluded — its content is
 * read by the model for STYLE emulation only and the orchestrator must
 * suppress any citation pointing at it.
 *
 * `biblical-text-edition` is included even though its `rigorTier` is 0:
 * the rigor tier reflects "extra academic weight beyond baseline";
 * citing the text edition is expected, not "high-rigor", but it's
 * still a legitimate citation.
 */
export const CITABLE_SOURCE_TYPES: ReadonlySet<SourceType> = new Set(
    (Object.values(SOURCE_TYPE_CATALOG) as SourceTypeMetadata[])
        .filter(m => m.defaultCitationDiscipline !== 'never-cite')
        .map(m => m.type)
);

export function isCitableSourceType(type: SourceType): boolean {
    return CITABLE_SOURCE_TYPES.has(type);
}

export function getSourceTypeMetadata(type: SourceType): SourceTypeMetadata {
    return SOURCE_TYPE_CATALOG[type];
}

/**
 * Source types grouped by their academic family for UI presentation
 * (the picker shows them in collapsible groups so the student isn't
 * overwhelmed by 13 flat options).
 */
export const SOURCE_TYPE_GROUPS = [
    {
        groupKey: 'primary-text',
        labelI18nKey: 'exegesis.sourceTypeGroups.primary-text',
        types: ['biblical-text-edition', 'critical-apparatus'] as const,
    },
    {
        groupKey: 'lexical',
        labelI18nKey: 'exegesis.sourceTypeGroups.lexical',
        types: ['lexicon-technical', 'theological-dictionary', 'grammar-syntax'] as const,
    },
    {
        groupKey: 'commentaries',
        labelI18nKey: 'exegesis.sourceTypeGroups.commentaries',
        types: ['commentary-critical', 'commentary-expository'] as const,
    },
    {
        groupKey: 'background',
        labelI18nKey: 'exegesis.sourceTypeGroups.background',
        types: [
            'historical-background',
            'theological-monograph',
            'journal-article',
            'primary-source-ancient',
        ] as const,
    },
    {
        groupKey: 'methodological',
        labelI18nKey: 'exegesis.sourceTypeGroups.methodological',
        types: ['style-template-paper', 'other'] as const,
    },
] as const;

// ── Migration shim from the old ProjectSourceRole ───────────────────
//
// The pre-redesign schema used `ProjectSourceRole` with 8 flat values.
// Existing test data on this branch (and any future migration of
// papers in flight) maps onto the new taxonomy via this table. The
// shim is intentionally exhaustive so the type system catches any
// missed legacy value.

export type LegacyProjectSourceRole =
    | 'primary-commentary'
    | 'secondary-commentary'
    | 'lexicon'
    | 'critical-apparatus'
    | 'historical-context'
    | 'theological-context'
    | 'model-paper'
    | 'misc';

export const LEGACY_ROLE_TO_SOURCE_TYPE: Readonly<Record<LegacyProjectSourceRole, SourceType>> = {
    'primary-commentary': 'commentary-critical',
    'secondary-commentary': 'commentary-expository',
    'lexicon': 'lexicon-technical',
    'critical-apparatus': 'critical-apparatus',
    'historical-context': 'historical-background',
    'theological-context': 'theological-monograph',
    'model-paper': 'style-template-paper',
    'misc': 'other',
};

export function migrateLegacyRole(role: LegacyProjectSourceRole | SourceType): SourceType {
    if (role in LEGACY_ROLE_TO_SOURCE_TYPE) {
        return LEGACY_ROLE_TO_SOURCE_TYPE[role as LegacyProjectSourceRole];
    }
    return role as SourceType;
}
