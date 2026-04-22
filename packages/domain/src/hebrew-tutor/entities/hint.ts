/**
 * HintDefinition — domain entity for the contextual hint system.
 *
 * Hints are data-driven: they are defined by a combination of
 * HintConditionKey values that the HintEngine evaluates against a
 * WordAnalysis at runtime. Conditions are stored as string keys, never
 * as executable code, which allows persistence in Firestore without
 * security risks.
 *
 * Architectural note:
 *  - The domain only defines the shape (HintDefinition, HintConditionKey).
 *  - Condition evaluation logic lives in the application layer (hint-engine).
 *  - Persistence (Firestore CRUD) lives in the infrastructure layer.
 *  - React hooks and UI rendering live in the presentation layer.
 */

/** Phase scope constant for hints that should appear on every phase. */
export const HINT_ALL_PHASES = 'ALL' as const;

/**
 * Named condition keys that the HintEngine can evaluate against a WordAnalysis.
 *
 * Rules:
 *  - Each key maps 1:1 to a pure function `(word: WordAnalysis) => boolean`.
 *  - New keys require a corresponding entry in the condition map (hint-conditions.ts).
 *  - Keys are stored as strings in Firestore and must never be renamed once deployed.
 */
export enum HintConditionKey {
  /** No condition — hint always shows if its phase matches. */
  ALWAYS               = 'ALWAYS',

  // ── Morpheme presence ───────────────────────────────────────────────────
  HAS_WAW_PREFIX       = 'HAS_WAW_PREFIX',        // WAW_CONSECUTIVE | WAW_CONJUNCTIVE
  HAS_PREFORMATIVE     = 'HAS_PREFORMATIVE',       // PREFORMATIVE morpheme present
  HAS_DAGESH_FORTE     = 'HAS_DAGESH_FORTE',       // DAGESH_FORTE present
  HAS_PREFIX_STEM      = 'HAS_PREFIX_STEM',        // PREFIX_STEM (Nifal, Hifil, Hitpael…)
  HAS_PRONOMINAL_SUFFIX= 'HAS_PRONOMINAL_SUFFIX',  // PRONOMINAL_SUFFIX present
  HAS_PREPOSITION_PFX  = 'HAS_PREPOSITION_PFX',   // PREPOSITION_PREFIX present

  // ── Verb type (VerbType enum) ────────────────────────────────────────────
  IS_STRONG_VERB       = 'IS_STRONG_VERB',
  IS_WEAK_VERB         = 'IS_WEAK_VERB',           // NOT strong, NOT gutural
  IS_III_HE            = 'IS_III_HE',
  IS_III_ALEF          = 'IS_III_ALEF',
  IS_I_NUN             = 'IS_I_NUN',
  IS_I_YOD_WAW         = 'IS_I_YOD_WAW',
  IS_II_WAW_YOD        = 'IS_II_WAW_YOD',
  IS_GEMINATE          = 'IS_GEMINATE',
  IS_GUTURAL           = 'IS_GUTURAL',             // any GUTURAL_Rx
  IS_GUTURAL_R1        = 'IS_GUTURAL_R1',
  IS_GUTURAL_R2        = 'IS_GUTURAL_R2',
  IS_GUTURAL_R3        = 'IS_GUTURAL_R3',

  // ── Verb form (VerbForm enum) ────────────────────────────────────────────
  IS_WAYYIQTOL         = 'IS_WAYYIQTOL',
  IS_IMPERFECT         = 'IS_IMPERFECT',
  IS_PERFECT           = 'IS_PERFECT',
  IS_INF_CONSTRUCT     = 'IS_INF_CONSTRUCT',
  IS_INF_ABSOLUTE      = 'IS_INF_ABSOLUTE',
  IS_PARTICIPLE        = 'IS_PARTICIPLE',
  IS_IMPERATIVE        = 'IS_IMPERATIVE',

  IS_QAL               = 'IS_QAL',
  IS_NIFAL             = 'IS_NIFAL',
  IS_PIEL              = 'IS_PIEL',
  IS_HIFIL             = 'IS_HIFIL',
  IS_HITPAEL           = 'IS_HITPAEL',

  // ── Nominal conditions ───────────────────────────────────────────────────
  IS_NOUN              = 'IS_NOUN',
  IS_ADJECTIVE         = 'IS_ADJECTIVE',
  IS_PRONOUN           = 'IS_PRONOUN',
  IS_PARTICLE          = 'IS_PARTICLE',
  
  IS_MASCULINE         = 'IS_MASCULINE',
  IS_FEMININE          = 'IS_FEMININE',
  IS_PLURAL            = 'IS_PLURAL',
  IS_DUAL              = 'IS_DUAL',
  IS_CONSTRUCT         = 'IS_CONSTRUCT',
}

/** Visual severity of a hint, which drives its color scheme in the UI. */
export type HintSeverity = 'info' | 'warning' | 'tip';

/**
 * A single hint entry in the catalog.
 *
 * Persistence: stored in Firestore at `hebrewTutor/config/hints/{id}`.
 * Local defaults: defined in `default-hints.ts` and used as fallback.
 */
export interface HintDefinition {
  /** Stable unique identifier. Local defaults use prefix `local_`. */
  readonly id: string;

  /**
   * Phase in which this hint appears.
   * Use HINT_ALL_PHASES ('ALL') to show across all phases.
   * Uses the numeric value of DetectivePhase enum.
   */
  readonly phase: number | typeof HINT_ALL_PHASES;

  readonly severity: HintSeverity;

  /** Optional short header rendered above the body. */
  readonly title?: string;

  /**
   * Body text. Supports a small markdown-lite subset:
   *  **bold**, _italic_, inline `code`
   */
  readonly body: string;

  /**
   * Conditions evaluated with AND logic.
   * All must be true for the hint to show.
   * Empty array = always show (equivalent to [ALWAYS]).
   */
  readonly conditions: HintConditionKey[];

  /**
   * Exclusion conditions evaluated with NOT logic.
   * If any evaluates to true, the hint is suppressed.
   */
  readonly excludeConditions: HintConditionKey[];

  /** Whether the hint is active. Admins can disable without deleting. */
  readonly enabled: boolean;

  /** Display order within a phase. Lower = earlier. */
  readonly order: number;

  /**
   * Progressive disclosure level.
   *  0 = always visible (default — backward compatible with existing hints)
   *  1 = shown after student requests first hint
   *  2 = shown after student requests second hint
   *  3 = shown only after an incorrect answer (remedial)
   *
   * Omitted or 0 means the hint behaves exactly as before.
   */
  readonly level?: number;
}
