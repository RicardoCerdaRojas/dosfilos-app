/**
 * Hebrew grammar value objects: Binyan (verb stem), VerbForm, VerbType,
 * GrammaticalCategory, and MorphemeRole.
 *
 * These enums reflect the pedagogical terminology used by Farfán and the
 * professor's lessons. They are the authoritative naming within this domain.
 */

/** The seven Hebrew verb stems (themes/binyanim). */
export enum Binyan {
  QAL = 'QAL',
  NIFAL = 'NIFAL',
  PIEL = 'PIEL',
  PUAL = 'PUAL',
  HITPAEL = 'HITPAEL',
  HIFIL = 'HIFIL',
  HOFAL = 'HOFAL',
}

/** Conjugated verbal forms. */
export enum VerbForm {
  PERFECT = 'PERFECT',
  IMPERFECT = 'IMPERFECT',
  WAYYIQTOL = 'WAYYIQTOL',
  WEQATAL = 'WEQATAL',
  IMPERATIVE = 'IMPERATIVE',
  COHORTATIVE = 'COHORTATIVE',
  JUSSIVE = 'JUSSIVE',
  INF_CONSTRUCT = 'INF_CONSTRUCT',
  INF_ABSOLUTE = 'INF_ABSOLUTE',
  PARTICIPLE_ACTIVE = 'PARTICIPLE_ACTIVE',
  PARTICIPLE_PASSIVE = 'PARTICIPLE_PASSIVE',
}

/** Classification of weak verb types (Farfán ch. V). */
export enum VerbType {
  STRONG = 'STRONG',
  I_ALEF = 'I_ALEF',
  I_NUN = 'I_NUN',
  I_YOD_WAW = 'I_YOD_WAW',
  II_WAW_YOD = 'II_WAW_YOD',
  III_HE = 'III_HE',
  III_ALEF = 'III_ALEF',
  GEMINATE = 'GEMINATE',
  GUTURAL_R1 = 'GUTURAL_R1',
  GUTURAL_R2 = 'GUTURAL_R2',
  GUTURAL_R3 = 'GUTURAL_R3',
}

/** Part of speech categories. */
export enum GrammaticalCategory {
  VERB = 'VERB',
  NOUN = 'NOUN',
  ADJECTIVE = 'ADJECTIVE',
  PRONOUN = 'PRONOUN',
  PERSONAL_PRONOUN = 'PERSONAL_PRONOUN',
  DEMONSTRATIVE_PRONOUN = 'DEMONSTRATIVE_PRONOUN',
  RELATIVE_PRONOUN = 'RELATIVE_PRONOUN',
  PREPOSITION = 'PREPOSITION',
  CONJUNCTION = 'CONJUNCTION',
  DEFINITE_ARTICLE = 'DEFINITE_ARTICLE',
  PARTICLE = 'PARTICLE',
  ADVERB = 'ADVERB',
  INTERJECTION = 'INTERJECTION',
  PROPER_NOUN = 'PROPER_NOUN',
  OBJECT_MARKER = 'OBJECT_MARKER',
  INTERROGATIVE = 'INTERROGATIVE',
  NEGATIVE_PARTICLE = 'NEGATIVE_PARTICLE',
}

/**
 * Role of each morpheme segment within a word.
 * Used by the color-coding visual system.
 */
export enum MorphemeRole {
  // Verbal morphemes
  PREFIX_STEM = 'PREFIX_STEM',       // נ of Nifal, הת of Hitpael, ה of Hifil
  PREFORMATIVE = 'PREFORMATIVE',     // imperfect preformative (י, ת, א, נ)
  ROOT_R1 = 'ROOT_R1',               // first radical of root
  ROOT_R2 = 'ROOT_R2',               // second radical of root
  ROOT_R3 = 'ROOT_R3',               // third radical of root
  THEME_VOWEL = 'THEME_VOWEL',       // characteristic vowel pattern of binyan
  DAGESH_FORTE = 'DAGESH_FORTE',     // doubling indicator (Piel, Pual, etc.)
  AFFORMATIVE = 'AFFORMATIVE',       // person/gender/number suffix
  PRONOMINAL_SUFFIX = 'PRONOMINAL_SUFFIX',

  // Nominal morphemes
  DEFINITE_ARTICLE = 'DEFINITE_ARTICLE',
  CONSTRUCT_ENDING = 'CONSTRUCT_ENDING',
  PLURAL_ENDING = 'PLURAL_ENDING',
  DUAL_ENDING = 'DUAL_ENDING',
  FEMININE_ENDING = 'FEMININE_ENDING',

  // Prefixed particles
  WAW_CONJUNCTIVE = 'WAW_CONJUNCTIVE',
  WAW_CONSECUTIVE = 'WAW_CONSECUTIVE',
  PREPOSITION_PREFIX = 'PREPOSITION_PREFIX',
  CONJUNCTION_PREFIX = 'CONJUNCTION_PREFIX',
}

/** Grammatical state of a noun. */
export enum NominalState {
  ABSOLUTE = 'ABSOLUTE',
  CONSTRUCT = 'CONSTRUCT',
}

/** Grammatical gender. */
export enum Gender {
  MASCULINE = 'M',
  FEMININE = 'F',
  COMMON = 'C',
}

/** Grammatical number. */
export enum GrammaticalNumber {
  SINGULAR = 'S',
  PLURAL = 'P',
  DUAL = 'D',
}

/** Grammatical person. */
export enum Person {
  FIRST = 1,
  SECOND = 2,
  THIRD = 3,
}
