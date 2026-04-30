import type { SourceType } from './SourceType';
import type { ExegeticalStepKind } from './ExegeticalStep';

/**
 * Paper-level rubric — the seminary's grading criteria for THIS paper,
 * structured so the system can both (a) check the user's corpus and
 * plan against the requirements (gap detection) and (b) teach a novice
 * student the rationale behind each requirement.
 *
 * Per the redesign discussion, the rubric is a first-class entity
 * separate from `UserStyleGuide`: the style guide is persistent at the
 * user level (the seminary's TMS guide changes once a year), whereas
 * the rubric is per-paper (one rubric for an exegetical paper on
 * Hebrews 1:1-4, a different one for the next assignment).
 *
 * Storage: stored inline inside `ExegeticalPaper.rubric`. No separate
 * collection — one rubric per paper, lifecycle bound to the paper.
 *
 * Source of truth: either uploaded by the student (PDF/text) and parsed
 * by `IPaperRubricExtractor`, or generated from `DEFAULT_RUBRIC_TEMPLATE`
 * when the student opts in to the system default (e.g. they don't have
 * a rubric from their professor for this assignment). The
 * `provenance` field keeps that distinction visible in the UI so
 * students know whether the requirements come from their seminary or
 * from a sensible default.
 */
export interface PaperRubric {
    /**
     * Where the rubric came from. Drives the UI hint shown alongside
     * each requirement (a system-default requirement is presented as
     * "suggested for academic rigor", whereas an extracted-from-document
     * requirement is presented as "your seminary requires").
     */
    provenance: RubricProvenance;

    /**
     * Optional human-friendly title — "TMS NT800 Hebrews exegetical
     * paper, Spring 2025". Defaults to a localized fallback when the
     * extractor can't find one.
     */
    title: string | null;

    /**
     * Free-text description of the assignment as parsed from the source
     * (or empty for system defaults). Useful context for the student to
     * confirm "yes, this is the rubric I expect".
     */
    description: string | null;

    /**
     * Expected length, expressed as a range in either pages or words.
     * Both bounds are nullable so partial information from the rubric
     * can be captured (e.g. "minimum 15 pages" with no upper bound).
     */
    expectedLength: ExpectedLengthRange | null;

    /**
     * Citation standard the rubric requires (e.g. "TMS 2024-25",
     * "Turabian 9th ed."). Used for cross-checking against the user's
     * active style guide — if the rubric says Turabian and the user's
     * style guide is SBL, we flag a mismatch in the setup UI.
     *
     * Free-form string (not enum) because the space of citation
     * standards is open and each seminary phrases them differently.
     */
    citationStandard: string | null;

    /**
     * Per-`SourceType` quantitative requirements. The setup UI
     * computes "you have N of M required" against the user's corpus
     * and surfaces gaps. Empty array means the rubric has no
     * type-specific minimums (rare; used by the very-permissive
     * default).
     */
    sourceRequirements: ReadonlyArray<SourceRequirement>;

    /**
     * Per-step structural expectations. For each step kind, which
     * source types should appear and what to emphasize. Drives the
     * default `StepSourcePlan` proposed to the student.
     *
     * If empty, the system falls back to `SOURCE_TYPE_CATALOG`
     * `typicalUsage` defaults — coarser but still sensible.
     */
    structuralExpectations: ReadonlyArray<StructuralExpectation>;

    /**
     * Optional pointer to the corpus that originated this rubric (for
     * uploaded rubrics). Null for system defaults and pasted-text
     * rubrics. Lets the UI offer "view original" and lets the
     * extractor re-parse if the user requests a refresh.
     */
    sourceCorpusId: string | null;

    /**
     * Free-text the user may paste in lieu of uploading a document
     * (e.g. they only have an email from their professor). Stored so
     * we can re-extract if the prompt evolves.
     */
    sourcePastedText: string | null;

    /** When the rubric was first attached to the paper. */
    createdAt: Date;
    /** Last time the user edited or re-extracted the rubric. */
    updatedAt: Date;
}

export type RubricProvenance =
    | 'extracted-from-document'   // Uploaded PDF parsed by the extractor
    | 'extracted-from-text'       // Pasted text parsed by the extractor
    | 'system-default'            // Hard-coded TMS exegetical default
    | 'user-edited';              // User hand-edited an extracted/default rubric

export interface ExpectedLengthRange {
    /** 'pages' or 'words'. Stored explicitly so the UI doesn't have to guess. */
    unit: 'pages' | 'words';
    min: number | null;
    max: number | null;
}

/**
 * Quantitative requirement: at least `minimum` and at most `maximum`
 * sources of the given type. The student's corpus is checked against
 * this and gaps are surfaced before generation can start.
 */
export interface SourceRequirement {
    sourceType: SourceType;
    /** Minimum number of sources of this type required. 0 = explicitly optional. */
    minimum: number;
    /** Optional maximum. Null means no upper bound. */
    maximum: number | null;
    /**
     * One-line rationale shown to the student ("para análisis lexical
     * técnico el seminario espera al menos un BDAG/HALOT"). Localized
     * already — the extractor produces the rationale in the paper's
     * `displayLanguage`, and system defaults provide both languages
     * via i18n keys.
     *
     * For rubrics extracted from a document this is a verbatim or
     * paraphrased justification from the source; for system defaults
     * it's a curated explanation we own.
     */
    justification: string;
}

/**
 * Section-level expectation. For each step kind (introduction, verse,
 * conclusion), which source types should be emphasized. The setup
 * UI's "structural plan" step pre-fills its picker from this and lets
 * the student override.
 *
 * The `assembly` step is intentionally omitted — assembly is purely
 * mechanical concatenation, no source emphasis applies.
 */
export interface StructuralExpectation {
    /** 'introduction' | 'verse' | 'conclusion'. */
    section: Exclude<ExegeticalStepKind, 'assembly'>;
    /**
     * Source types that should typically contribute to this section.
     * The orchestrator weights them up; types not in this list are
     * still allowed but de-emphasized.
     */
    emphasizedTypes: ReadonlyArray<SourceType>;
    /** Pedagogical rationale shown in the plan UI. */
    justification: string;
}

/**
 * Default rubric for TMS-style exegetical papers — applied when the
 * user has no per-paper rubric to upload. Numbers are deliberately
 * conservative (achievable for a serious student paper) but enforce
 * the academic-rigor floor we want to teach.
 *
 * Justifications use generic English here; the UI layer translates
 * them via i18n keys keyed off `sourceType` when rendering. A future
 * refactor can replace these strings with i18n keys directly so
 * non-English rendering doesn't go through a translation table —
 * deferred because it makes this constant noisier without changing
 * runtime behavior.
 */
export const DEFAULT_TMS_EXEGETICAL_RUBRIC: PaperRubric = {
    provenance: 'system-default',
    title: 'TMS-style exegetical paper (default rubric)',
    description:
        'Applied when no seminary-specific rubric is provided. Reflects the academic-rigor expectations of a Master\'s-level TMS / Turabian exegetical paper.',
    expectedLength: { unit: 'pages', min: 15, max: 25 },
    citationStandard: 'TMS / Turabian',
    sourceRequirements: [
        {
            sourceType: 'biblical-text-edition',
            minimum: 1,
            maximum: 2,
            justification: 'A serious exegetical paper engages the original-language text edition (NA28 / BHS / Rahlfs LXX).',
        },
        {
            sourceType: 'lexicon-technical',
            minimum: 1,
            maximum: null,
            justification: 'Word-level decisions must be grounded in a technical lexicon (BDAG / HALOT / LSJ), not a popular dictionary.',
        },
        {
            sourceType: 'theological-dictionary',
            minimum: 1,
            maximum: null,
            justification: 'A theological dictionary (TDNT / NIDNTTE / EDNT) supports semantic-domain and theological-context decisions beyond the lexicon.',
        },
        {
            sourceType: 'grammar-syntax',
            minimum: 1,
            maximum: null,
            justification: 'Syntactic claims must be supported by a technical grammar (BDF / Wallace / Robertson) — not just commentary opinion.',
        },
        {
            sourceType: 'commentary-critical',
            minimum: 2,
            maximum: null,
            justification: 'Two or more critical-technical commentaries (WBC / NIGTC / Hermeneia / ICC) anchor the paper\'s exegetical argument in current scholarship.',
        },
        {
            sourceType: 'commentary-expository',
            minimum: 1,
            maximum: 3,
            justification: 'A mid-level expository commentary (NICOT/NICNT / BECNT / Pillar) bridges the technical exegesis to its theological synthesis.',
        },
        {
            sourceType: 'historical-background',
            minimum: 1,
            maximum: null,
            justification: 'Historical-cultural context (deSilva / Keener / ABD) prevents ahistorical readings.',
        },
        {
            sourceType: 'theological-monograph',
            minimum: 0,
            maximum: null,
            justification: 'A focused monograph adds depth on a specific theological theme — recommended but not strictly required.',
        },
        {
            sourceType: 'journal-article',
            minimum: 0,
            maximum: null,
            justification: 'Recent peer-reviewed articles surface current scholarly debate — recommended for upper-level work.',
        },
        {
            sourceType: 'primary-source-ancient',
            minimum: 0,
            maximum: null,
            justification: 'Ancient primary sources (Josephus / Philo / Apostolic Fathers) strengthen background claims.',
        },
    ],
    structuralExpectations: [
        {
            section: 'introduction',
            emphasizedTypes: ['historical-background', 'theological-monograph', 'commentary-expository'],
            justification:
                'The introduction frames the passage and presents the thesis — historical context and theological positioning carry it; technical lexical/syntactic analysis belongs in the body.',
        },
        {
            section: 'verse',
            emphasizedTypes: [
                'biblical-text-edition',
                'critical-apparatus',
                'lexicon-technical',
                'theological-dictionary',
                'grammar-syntax',
                'commentary-critical',
            ],
            justification:
                'Verse-by-verse work is where text-critical, lexical, and syntactic decisions live. Critical commentaries lead the discussion; expository commentaries play a supporting role.',
        },
        {
            section: 'conclusion',
            emphasizedTypes: ['commentary-critical', 'commentary-expository', 'theological-monograph'],
            justification:
                'The conclusion synthesizes the verse-level findings into a coherent theological reading — commentaries and monographs provide the integrative voice; lexicons step back.',
        },
    ],
    sourceCorpusId: null,
    sourcePastedText: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
};

/**
 * Builds a fresh instance of the default rubric with current
 * timestamps. Used at paper-creation time when the user opts in to
 * the system default. Returning a fresh instance avoids accidental
 * mutation of the shared template constant.
 */
export function buildDefaultRubric(): PaperRubric {
    const now = new Date();
    return {
        ...DEFAULT_TMS_EXEGETICAL_RUBRIC,
        // Spread copies the shape; explicit overrides for the date
        // fields ensure each new paper records when its rubric was
        // applied (vs. the 1970-epoch sentinel on the template).
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Compliance result of checking a corpus (a list of `ProjectSource`
 * sourceTypes) against a rubric. The setup UI renders this as the gap
 * widget and gates the "Continue to plan" button.
 *
 * Pure data — no behavior. Computed by a free function in the
 * application layer (not on the entity itself) so callers can choose
 * when to recompute (e.g. on every source change vs. on demand).
 */
export interface RubricComplianceReport {
    /** Per-requirement breakdown — one entry per `SourceRequirement`. */
    requirements: ReadonlyArray<RequirementCheck>;
    /** True when every minimum is met. */
    meetsMinimums: boolean;
    /** Sum of `minimum - have` across requirements with `have < minimum`. */
    totalMissing: number;
}

export interface RequirementCheck {
    sourceType: SourceType;
    required: number;
    have: number;
    missing: number;
    /** True iff `have >= required`. */
    satisfied: boolean;
    /** Justification copied verbatim from the matching `SourceRequirement`. */
    justification: string;
}
