/**
 * hint-conditions.ts
 *
 * Maps every HintConditionKey to a pure boolean function that evaluates
 * a WordAnalysis. This module is the ONLY place where condition logic lives.
 *
 * Rules:
 *  - Functions must be pure and side-effect free.
 *  - Each entry must correspond 1:1 to a HintConditionKey.
 *  - Adding a new condition requires: (1) adding the key to HintConditionKey,
 *    (2) adding the function here.
 */

import type { WordAnalysis } from '@dosfilos/domain';
import { HintConditionKey, MorphemeRole, VerbType, VerbForm, Binyan } from '@dosfilos/domain';

export type ConditionFn = (word: WordAnalysis) => boolean;

const hasMorphemeRole = (word: WordAnalysis, role: MorphemeRole): boolean =>
  (word.morphemes ?? []).some(m => m.role === role);

const isVerbType = (word: WordAnalysis, ...types: VerbType[]): boolean =>
  types.includes(word.verbMorphology?.verbType as VerbType);

const isVerbForm = (word: WordAnalysis, ...forms: VerbForm[]): boolean =>
  forms.includes(word.verbMorphology?.verbForm as VerbForm);

const isBinyan = (word: WordAnalysis, ...binyans: Binyan[]): boolean =>
  binyans.includes(word.verbMorphology?.binyan as Binyan);

/**
 * The authoritative condition map.
 * TypeScript ensures every HintConditionKey has an entry (Record completeness).
 */
export const HINT_CONDITIONS: Record<HintConditionKey, ConditionFn> = {
  // ── General ──────────────────────────────────────────────────────────────
  [HintConditionKey.ALWAYS]: () => true,

  // ── Morpheme presence ────────────────────────────────────────────────────
  [HintConditionKey.HAS_WAW_PREFIX]: (w) =>
    hasMorphemeRole(w, MorphemeRole.WAW_CONSECUTIVE) ||
    hasMorphemeRole(w, MorphemeRole.WAW_CONJUNCTIVE),

  [HintConditionKey.HAS_PREFORMATIVE]: (w) =>
    hasMorphemeRole(w, MorphemeRole.PREFORMATIVE),

  [HintConditionKey.HAS_DAGESH_FORTE]: (w) =>
    hasMorphemeRole(w, MorphemeRole.DAGESH_FORTE),

  [HintConditionKey.HAS_PREFIX_STEM]: (w) =>
    hasMorphemeRole(w, MorphemeRole.PREFIX_STEM),

  [HintConditionKey.HAS_PRONOMINAL_SUFFIX]: (w) =>
    hasMorphemeRole(w, MorphemeRole.PRONOMINAL_SUFFIX),

  [HintConditionKey.HAS_PREPOSITION_PFX]: (w) =>
    hasMorphemeRole(w, MorphemeRole.PREPOSITION_PREFIX),

  // ── Verb type ────────────────────────────────────────────────────────────
  [HintConditionKey.IS_STRONG_VERB]: (w) =>
    isVerbType(w, VerbType.STRONG),

  [HintConditionKey.IS_WEAK_VERB]: (w) =>
    !isVerbType(w, VerbType.STRONG) &&
    !isVerbType(w, VerbType.GUTURAL_R1, VerbType.GUTURAL_R2, VerbType.GUTURAL_R3),

  [HintConditionKey.IS_III_HE]: (w)    => isVerbType(w, VerbType.III_HE),
  [HintConditionKey.IS_III_ALEF]: (w)  => isVerbType(w, VerbType.III_ALEF),
  [HintConditionKey.IS_I_NUN]: (w)     => isVerbType(w, VerbType.I_NUN),
  [HintConditionKey.IS_I_YOD_WAW]: (w) => isVerbType(w, VerbType.I_YOD_WAW),
  [HintConditionKey.IS_II_WAW_YOD]: (w)=> isVerbType(w, VerbType.II_WAW_YOD),
  [HintConditionKey.IS_GEMINATE]: (w)  => isVerbType(w, VerbType.GEMINATE),

  [HintConditionKey.IS_GUTURAL]: (w) =>
    isVerbType(w, VerbType.GUTURAL_R1, VerbType.GUTURAL_R2, VerbType.GUTURAL_R3),

  [HintConditionKey.IS_GUTURAL_R1]: (w) => isVerbType(w, VerbType.GUTURAL_R1),
  [HintConditionKey.IS_GUTURAL_R2]: (w) => isVerbType(w, VerbType.GUTURAL_R2),
  [HintConditionKey.IS_GUTURAL_R3]: (w) => isVerbType(w, VerbType.GUTURAL_R3),

  // ── Verb form ────────────────────────────────────────────────────────────
  [HintConditionKey.IS_WAYYIQTOL]: (w)     => isVerbForm(w, VerbForm.WAYYIQTOL),
  [HintConditionKey.IS_IMPERFECT]: (w)     => isVerbForm(w, VerbForm.IMPERFECT),
  [HintConditionKey.IS_PERFECT]: (w)       => isVerbForm(w, VerbForm.PERFECT),
  [HintConditionKey.IS_INF_CONSTRUCT]: (w) => isVerbForm(w, VerbForm.INF_CONSTRUCT),
  [HintConditionKey.IS_INF_ABSOLUTE]: (w)  => isVerbForm(w, VerbForm.INF_ABSOLUTE),
  [HintConditionKey.IS_IMPERATIVE]: (w)    => isVerbForm(w, VerbForm.IMPERATIVE),

  [HintConditionKey.IS_PARTICIPLE]: (w) =>
    isVerbForm(w, VerbForm.PARTICIPLE_ACTIVE, VerbForm.PARTICIPLE_PASSIVE),

  // ── Binyan ───────────────────────────────────────────────────────────────
  [HintConditionKey.IS_QAL]:      (w) => isBinyan(w, Binyan.QAL),
  [HintConditionKey.IS_NIFAL]:    (w) => isBinyan(w, Binyan.NIFAL),
  [HintConditionKey.IS_PIEL]:     (w) => isBinyan(w, Binyan.PIEL),
  [HintConditionKey.IS_HIFIL]:    (w) => isBinyan(w, Binyan.HIFIL),
  [HintConditionKey.IS_HITPAEL]:  (w) => isBinyan(w, Binyan.HITPAEL),
};
